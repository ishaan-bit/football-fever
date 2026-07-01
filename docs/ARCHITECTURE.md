# Architecture

This document explains how Football Fever is put together: how data flows from the World Cup API (or seed) to the UI, how The Oracle and the odds engine work, how realtime is layered, how state is managed, and how the design system is built. It is written to match the actual code.

The governing principle, encoded in `src/lib/env.ts`, is **graceful degradation**: the app must run with zero secrets, and every integration is feature‑flagged with a local fallback.

---

## 1. Data flow

```
        ┌──────────────────────────────────────────────────────────────────┐
        │  SOURCE                                                           │
        │                                                                   │
        │  World Cup 2026 API (worldcup26.ir)        Bundled seed dataset   │
        │  /auth/authenticate (JWT, ~84d)            src/lib/data/*         │
        │  /get/teams /get/games /get/stadiums       48 teams · 16 venues   │
        │  /get/groups /health                       104 deterministic      │
        │        │                                   matches (simulated)    │
        │        ▼                                          │               │
        │  src/lib/worldcup/client.ts                       │               │
        │  (token cache, fetch, revalidate)                 │               │
        │        │                                          │               │
        │        ▼                                          │               │
        │  src/lib/worldcup/normalize.ts                    │               │
        │  RawTeam/RawGame/RawStadium  →  Team/Match/Venue   │               │
        └────────┼──────────────────────────────────────────┼──────────────┘
                 │                                           │
                 ▼                                           ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │  FACADE   src/lib/worldcup/index.ts  ("server-only")              │
        │  loadMatches / loadTeams / loadVenues / dataSourceStatus          │
        │  features.liveData ? live API (if it returns data) : seed         │
        └────────┬─────────────────────────────────────────────────────────┘
                 │
                 ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │  DATA LAYER   src/lib/data/index.ts                              │
        │  projectMatch(base, now):                                        │
        │   • statusFromClock() — wall clock → scheduled/live/HT/finished   │
        │   • knockout team gating — hide teams until feeder matches finish │
        │   • running score + partial timeline from events ≤ current minute │
        └────────┬─────────────────────────────────────────────────────────┘
                 │ Match / Team / Venue / Group  (clean domain types)
                 ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │  DOMAIN ENGINES (pure, deterministic)                            │
        │  oracle/engine.ts → OraclePrediction                             │
        │  betting/odds.ts  → MatchOdds  (consumes OraclePrediction)        │
        │  predictions/scoring.ts → points/correct                         │
        │  ai/host.ts → AiHostMessage (reacts to verified events only)      │
        └────────┬─────────────────────────────────────────────────────────┘
                 │
                 ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │  UI   src/app/* (RSC + client) · components/* · hooks/* · stores  │
        │  Realtime overlay: BroadcastChannel + simulation (demo) /         │
        │  Supabase Realtime + Presence / LiveKit (when configured)         │
        └──────────────────────────────────────────────────────────────────┘
```

### Source → normalize → facade

- `src/lib/worldcup/client.ts` is a thin, resilient, **server‑only** client. It resolves a JWT (pasted `WORLDCUP_API_TOKEN`, or auto‑mints one from email/password and caches it for ~80 days), then `GET`s the endpoints with Next.js `revalidate` windows (e.g. teams/stadiums cached an hour, games 15s). Any failure returns `null`.
- `src/lib/worldcup/normalize.ts` converts the API's stringly‑typed `RawTeam` / `RawGame` / `RawStadium` into clean `Team` / `Match` / `Venue` domain types (`src/types/index.ts`). It parses the API's `MM/DD/YYYY HH:MM` local date into an ISO string and maps `finished`/`time_elapsed` into a `MatchStatus`.
- `src/lib/worldcup/index.ts` is the **single data facade**. `loadMatches/loadTeams/loadVenues` use the live API only when `features.liveData` is true *and* it actually returns data, otherwise they return the seed. `dataSourceStatus()` reports `"live-api"` vs `"seed"`. Nothing else in the app knows which source is live.

### The seed dataset (demo mode)

`src/lib/data/fixtures.ts` is a **deterministic World Cup simulator**. Using a seeded PRNG (mulberry32, `src/lib/utils.ts`), it builds:

- **72 group matches** (12 groups × round‑robin), all played, with full event timelines that resolve to the simulated score, and computed group standings (with best‑third‑place selection).
- **32 knockout matches** with a fully resolved bracket (R32 → R16 → QF → SF → 3rd place → Final), penalties where needed.

These are `BASE_MATCHES`: pure, clock‑independent, cacheable. They are sorted by kickoff and exported alongside `GROUPS` and `BRACKET_NODES`.

### Live‑status projection

`src/lib/data/index.ts` layers "now" onto the base data at read‑time, so the same dataset feels alive at any moment of the tournament window:

- **`statusFromClock(kickoff, now)`** maps elapsed minutes to a status: `< 0` scheduled; `0–45` live; `45–60` halftime; `60–105` live (second half, capped at 90'); `105–110` live at 90'; `≥ 110` finished.
- **`projectMatch(base, now)`** then:
  - **Knockout team gating** — for stages beyond `r32`, a match's teams are hidden (`null`) until *both* feeder matches (from `BRACKET_NODES[].feeders`) are finished. This reproduces a realistic bracket where you don't know the QF participants until the R16 is done.
  - For scheduled/no‑teams matches it nulls out scores/events.
  - For live/halftime it derives the **running score** and a **partial timeline** by including only events with `minute ≤ current minute` (and dropping `fulltime`).
- Accessors built on this: `getMatches`, `getMatch`, `getLiveMatches`, `getUpcomingMatches`, `getRecentResults`, `getFeaturedMatch`, `getBracket`, `getStandings`, etc. — all accept an optional `now` for testability.

---

## 2. The Oracle (`src/lib/oracle/engine.ts`)

The Oracle is an **explainable, deterministic** match model. `runOracle(match, ctx?)` returns an `OraclePrediction | null` (null if a team is unknown). Same match in → identical call out, because all randomness is seeded from `hashSeed("oracle:" + match.id)` and only drives *prose variety*, never the numbers.

Pipeline:

1. **Strength rating** — `diff = home.rating − away.rating` (ratings are 0–100, set per team in the seed / API).
2. **Expected goals (xG)** — derived from the rating diff, recent **form** (`ctx.homeForm/awayForm`, W/D/L), a small **host/crowd lift** (`ctx.homeIsHost` ≈ +0.12 goals), and a **stage** tightening for knockouts. Clamped to sane ranges.
3. **Bivariate‑Poisson goal model** — a 7×7 score matrix (0–6 goals each side) via independent Poisson on the two xG values, aggregated into **home/draw/away** probabilities and normalized to sum to 1. The top scorelines become `scorelineProbabilities`, the most likely is `likelyScoreline`.
4. **Confidence (25–96)** — from the *separation* between the leading outcome and the field, plus the rating gap.
5. **Derived reads** — `momentum` (−100…100), `dangerTeamId`, an **upset radar** (active when the gap is large but the underdog still ≥ ~27%), `qualificationNote`/`tournamentImpact` per stage.
6. **Explainability** — `insights[]`: weighted, toned cards (strength, xG, momentum, host factor, upset, knockout effect) that drive the explainability bars. Plus a smug human `preview` and a one‑line `verdict`.

This determinism is asserted in `src/lib/oracle/engine.test.ts`.

---

## 3. Odds engine (`src/lib/betting/odds.ts`)

`makeOdds(match, prediction, margin = 0.07)` converts the Oracle's **true** probabilities into priced **decimal odds**:

- For each selection: `impliedProb = trueProb × (1 + margin)`, `decimal = max(1.01, 1 / impliedProb)`, and `edge = trueProb − impliedProb`. A positive edge means the Oracle thinks the price is wrong — a **value** pick. The best positive‑edge selection per market is flagged `recommended`, and the single highest‑edge selection across all markets becomes `bestValue`.
- Markets: `match_result`, `double_chance`, `over_under_2_5`, `btts`, `first_team_to_score`, `correct_score`, and — **knockouts only** — `to_qualify`. Over/under, BTTS and first‑to‑score are computed from the xG via Poisson tail math.
- Helpers: `decimalToFractional`, `americanFromDecimal`, `combinedOdds` (multiplies legs for accumulators).

This is **play‑money pricing**, not a sportsbook. Invariants are asserted in `src/lib/betting/odds.test.ts`. The bet ledger lives in `src/stores/bets.ts` (play‑coins, starting balance 1000, age confirmation, UPI id).

---

## 4. Prediction‑league scoring (`src/lib/predictions/scoring.ts`)

`scorePrediction(pick, match)` settles a pick against a **finished** match (returns `{ correct, points }`; zero if not finished). Points = `MARKET_BASE_POINTS[market] × RISK_MULTIPLIER[risk]` when correct — rewarding both difficulty (scoreline 120 vs winner 40) and the risk staked (Safe 1× → Wild 2.6×). `marketDefs(match)` builds the selectable markets, gating out `extra_time` during the group stage. Verified in `src/lib/predictions/scoring.test.ts`.

---

## 5. Realtime strategy

Realtime is layered so the room always feels alive, with progressive enhancement:

- **Demo mode (default)** — `src/hooks/use-room.ts`:
  - **Cross‑tab transport** via `BroadcastChannel("ff-room-<id>")` — messages, reactions and typing sync across the user's own tabs.
  - **Simulation heartbeat** — a paced interval where the **AI host reacts to newly‑surfaced verified events** (`hostOnEvent`, which *never invents* an event), friends pile on after goals, ambient chatter fills quiet moments, and the Oracle nudges occasionally. Goal events fire an `onGoal` callback (confetti/sound).
  - **Presence** — `src/hooks/use-presence.ts` simulates friend activity (watching / in‑call / typing) so rooms feel populated.
- **Supabase configured** — `getSupabaseBrowser()` / `getSupabaseServer()` return a real client; chat persists to `messages`/`message_reactions` (added to the `supabase_realtime` publication), and **Supabase Presence** replaces the simulated presence. Presence is **ephemeral** — never a table.
- **LiveKit configured** — `createCallToken(room, identity, name)` (`src/lib/livekit/token.ts`, a server action) mints a short‑lived access token for **voice and group‑video** watch‑parties. When unset it returns `null` and the call UI renders a fully‑interactive **local‑media mock** (avatars, mute states, grid).

---

## 6. State (zustand persisted stores)

Client state lives in small **zustand** stores under `src/stores/`, each persisted to `localStorage` via the `persist` middleware:

| Store | Persist key | Holds |
| --- | --- | --- |
| `user.ts` | `ff-user` | Guest/profile, onboarding, favorite team, UPI id; assigns a stable guest id on first mount |
| `predictions.ts` | `ff-predictions` | League picks; `settleForMatch` calls `scorePrediction`; computes points/accuracy/streak |
| `bets.ts` | `ff-bets` | Play‑coin balance, bet slip, placed bets, age confirmation, UPI |
| `social.ts` | `ff-social` (partial) | Per‑room messages, pins, challenges; seeds rooms from `people.ts` |
| `ui.ts`, `notifications.ts` | — | UI/ephemeral + notification feed |

Persistence is client‑only (`"use client"`), so SSR stays deterministic. When Supabase is configured, these become a cache in front of the database rather than the source of truth.

---

## 7. Design system

- **Tokens** — colors are stored as CSS custom properties holding raw HSL triplets (e.g. `--gold`, `--electric`, `--pitch`, `--live`, `--magenta`, `--brand-violet`). `hslVar(token, alpha?)` in `src/lib/utils.ts` wraps a token into a usable `hsl(...)` color. This lets accents be themed and alpha‑composited consistently.
- **Glass & motion** — a glassy, layered aesthetic (`BackgroundFX`, blur/translucency) with Framer Motion + GSAP transitions and `canvas-confetti` for goal moments. `tailwindcss-animate` and `class-variance-authority` drive component variants; `cn()` merges classes.
- **Typography** — Inter (sans), Space Grotesk (display), JetBrains Mono (mono), loaded via `next/font` as CSS variables in `src/app/layout.tsx`. The app is dark‑first.
- **PWA** — `public/manifest.webmanifest` (standalone, theme `#06070D`, home‑screen shortcuts to Fixtures/Oracle/Leaderboard) and `public/sw.js`: an app‑shell precache + network‑first navigations + stale‑while‑revalidate static assets, never caching `/api`, `/auth` or `?live` requests, with push + notification‑click handlers. `next.config.mjs` serves `/sw.js` with the right `Service-Worker-Allowed` header and allowlists the image CDNs.

---

## 8. Server vs client boundary

- **Server‑only** modules are marked `"server-only"` (`worldcup/client.ts`, `worldcup/index.ts`, `supabase/server.ts`) or `"use server"` (`livekit/token.ts`) — secrets (tokens, service role key, LiveKit secret) never reach the browser.
- **Client‑safe** feature detection is exposed via `publicFeatures` (booleans only). The pure domain engines (`oracle`, `betting`, `predictions`, `data`) are isomorphic and run on both sides identically because they are deterministic.
