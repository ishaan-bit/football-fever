# ⚽️ Football Fever

> **If Apple designed Discord for the World Cup.** A premium, social watch‑party PWA for the **FIFA World Cup 2026** — gather your group, watch every match together, predict live, play, and celebrate.

Football Fever turns each of the tournament's 104 matches into a room: live chat, voice and group‑video, an explainable prediction engine called **The Oracle**, a friendly prediction league, play‑coin markets with AI value picks, party micro‑games, leaderboards and badges — wrapped in a glassy, motion‑rich interface that installs to your home screen.

The headline trick: **it runs with zero secrets.** Clone, install, `npm run dev`, and you get the full experience on a bundled, accurate WC2026 dataset with simulated realtime. Add API keys to progressively light up live data, real accounts, realtime sync and voice.

---

## ✨ Features

| Feature | What it is |
| --- | --- |
| 🏟️ **Match Rooms** | A room per match with live chat, voice rooms and group‑video watch‑parties, presence, reactions and pinned moments. |
| 🔮 **The Oracle** | A deterministic, *explainable* match model: rating + bivariate‑Poisson goals + form + stage → win/draw/loss probabilities, expected goals, a likely scoreline, a confidence score, and human‑readable insights. Same match in → same call out. |
| 🎯 **Prediction League** | A friendly, points‑based league. Pick a market, choose your risk (Safe → Wild), bank points scaled by difficulty and the risk you staked. |
| 📈 **Play‑coin Markets** | The Oracle's true probabilities priced into decimal odds with a margin, plus **AI value picks** (where the price looks wrong). Build accumulators with play‑coins — never real money. |
| 🤝 **Friendly Challenges** | Peer‑to‑peer wagers (coffee, pizza, bragging rights) settled IRL or via **UPI** between friends. |
| 🎮 **Party Micro‑games** | Crowd Meter, Flash Predictions, Penalty Panic, VAR Court, Pass the Curse and more — synchronized party games for the room. |
| 🏆 **Leaderboards & Badges** | Tournament standings, accuracy, streaks and a badge catalog (Nostradamus, Upset Caller, Night Owl…). |
| 🗣️ **The AI Host** | The Oracle's voice — a member of the watch party that reacts *only* to verified match events (it never invents one) with personality that evolves as the tournament deepens. |
| 🟢 **Realtime Presence** | See who's watching, who's typing and who's in the call, live. |
| 📲 **PWA** | Installable, offline‑tolerant app shell, push‑ready service worker, home‑screen shortcuts. |

---

## 🧱 Tech stack

- **Framework:** [Next.js 15](https://nextjs.org) (App Router) · **React 19** · **TypeScript** (strict)
- **Styling:** Tailwind CSS v3 · CSS‑variable design tokens · `tailwindcss-animate` · `class-variance-authority`
- **UI primitives:** Radix UI · `lucide-react` icons · `sonner` toasts
- **Motion:** Framer Motion · GSAP · `canvas-confetti`
- **State:** [Zustand](https://github.com/pmndrs/zustand) (persisted stores)
- **Auth / DB / Realtime:** [Supabase](https://supabase.com) (`@supabase/ssr`, `@supabase/supabase-js`)
- **Voice / video:** [LiveKit](https://livekit.io) (`livekit-client`, `@livekit/components-react`, `livekit-server-sdk`)
- **Edge data:** [Upstash Redis](https://upstash.com)
- **Validation:** Zod · **Dates:** date-fns
- **Testing:** [Vitest](https://vitest.dev)
- **Deploy:** [Vercel](https://vercel.com)

---

## 🔌 Runs with zero secrets (demo mode)

The golden rule of the codebase (see `src/lib/env.ts`): **the app must run with no environment variables.** Every integration is feature‑flagged off the configured secrets and falls back to a local implementation:

- **No World Cup API token** → serves the bundled, deterministic WC2026 **seed dataset** (48 teams, 16 venues, all 104 matches). Live/finished/scheduled status is projected from the wall clock at read‑time, so the tournament always feels "alive".
- **No Supabase** → a local **guest profile** and **simulated realtime** (cross‑tab via `BroadcastChannel`, plus a friend‑activity simulation).
- **No LiveKit** → the call UI renders a fully‑interactive **local mock** (avatars, mute states, grid).
- **No Upstash** → an in‑memory store (per‑instance, non‑persistent).
- **No Anthropic key** → the AI host uses its **built‑in deterministic personality engine**, which only reacts to verified data and never fabricates events.

### Feature‑flag table

Derived from `features` / `publicFeatures` in `src/lib/env.ts`:

| Flag | Unlocked when these env vars are set | What it enables | Fallback when unset |
| --- | --- | --- | --- |
| `liveData` | `WORLDCUP_API_TOKEN` **or** (`WORLDCUP_API_EMAIL` + `WORLDCUP_API_PASSWORD`) | Live teams / venues / fixtures / scores from the World Cup API | Bundled seed dataset |
| `supabase` | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Real auth, Postgres persistence, Realtime + Presence | Guest profile + `BroadcastChannel`/simulated realtime |
| `livekit` | `NEXT_PUBLIC_LIVEKIT_URL` + `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET` | Real voice rooms & group‑video watch‑parties | Local‑media mock call UI |
| `redis` | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Persistent leaderboards, rate limiting, presence/live cache | In‑memory store |
| `anthropic` | `ANTHROPIC_API_KEY` | LLM‑supercharged AI host / Oracle commentary | Deterministic personality engine |

> `publicFeatures` exposes only **non‑secret** booleans to the client (`supabase`, `livekit`) so the UI can adapt without leaking keys.

---

## 🚀 Quick start

**Requirements:** Node **20+**, npm.

```bash
# 1. Install
npm install

# 2. (Optional) create your env file — every value is optional
cp .env.example .env.local

# 3. Run the dev server
npm run dev
```

Open <http://localhost:3000>. With an empty `.env.local`, you get the full demo‑mode experience.

---

## 🛠️ Scripts

| Script | Command | Description |
| --- | --- | --- |
| `dev` | `next dev` | Start the local dev server |
| `build` | `next build` | Production build |
| `start` | `next start` | Serve the production build |
| `lint` | `next lint` | ESLint (also run in CI; not blocking the build) |
| `typecheck` | `tsc --noEmit` | Strict TypeScript check |
| `test` | `vitest run` | Run the unit test suite once |
| `test:watch` | `vitest` | Run tests in watch mode |

---

## 🔑 Environment variables

Copy `.env.example` → `.env.local`. **Every value is optional.** Grouped by integration:

### World Cup 2026 data API
| Var | Description |
| --- | --- |
| `WORLDCUP_API_BASE_URL` | API base. Default `https://worldcup26.ir` |
| `WORLDCUP_API_TOKEN` | Long‑lived JWT (84 days) from `POST /auth/authenticate` |
| `WORLDCUP_API_EMAIL` | Optional auto‑login email (mints a token if no `WORLDCUP_API_TOKEN`) |
| `WORLDCUP_API_PASSWORD` | Optional auto‑login password |
| `NEXT_PUBLIC_LIVE_POLL_MS` | Live‑score poll cadence (ms). Default `20000` |

### Supabase
| Var | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server‑only.** Never expose to the client |

### LiveKit
| Var | Description |
| --- | --- |
| `NEXT_PUBLIC_LIVEKIT_URL` | `wss://your-project.livekit.cloud` |
| `LIVEKIT_API_KEY` | API key |
| `LIVEKIT_API_SECRET` | API secret |

### Upstash Redis
| Var | Description |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | REST token |

### Anthropic (optional)
| Var | Description |
| --- | --- |
| `ANTHROPIC_API_KEY` | Supercharges the AI host / Oracle commentary |
| `ANTHROPIC_MODEL` | Model id. Default `claude-opus-4-8` |

### App
| Var | Description |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public app URL. Default `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME` | Display name. Default `Football Fever` |
| `NEXT_PUBLIC_DEFAULT_TZ` | Kickoff display timezone. Default `Asia/Kolkata` (IST) |

---

## 📡 Data source — the worldcup2026 API

Live data is provided by the open **worldcup2026** API: <https://github.com/rezarahiminia/worldcup2026> (base: `https://worldcup26.ir`).

- **Auth:** `POST /auth/authenticate` with `{ email, password }` returns a JWT valid ~84 days. The app accepts a pasted `WORLDCUP_API_TOKEN`, or auto‑mints one from email/password and caches it server‑side.
- **Endpoints used:** `/get/teams`, `/get/groups`, `/get/games` (and `/get/game/:id`), `/get/stadiums`, plus `/health`.
- **Normalization:** raw (stringly‑typed) payloads are converted into clean domain types by `src/lib/worldcup/normalize.ts`, so the UI never touches a raw payload.
- **Seed fallback:** the data facade (`src/lib/worldcup/index.ts`) transparently falls back to the bundled deterministic seed dataset whenever the API is unconfigured or unavailable. Nothing else in the app needs to know which source is live.

---

## 🗂️ Project structure

```
football-fever/
├─ src/
│  ├─ app/                 # Next.js App Router (routes, layout, providers, PWA shell)
│  │  ├─ match/[id]/       # Match room
│  │  ├─ fixtures/  oracle/  predictions/  …
│  ├─ components/          # UI primitives + feature components
│  │  ├─ ui/  layout/  shared/  match/  fixtures/  games/
│  ├─ lib/
│  │  ├─ env.ts            # typed env access + feature flags
│  │  ├─ data/             # seed dataset + live-status projection
│  │  ├─ worldcup/         # API client + normalize + seed-fallback facade
│  │  ├─ oracle/           # The Oracle prediction engine
│  │  ├─ betting/          # odds engine
│  │  ├─ predictions/      # prediction-league scoring
│  │  ├─ ai/               # AI host personality engine
│  │  ├─ supabase/  livekit/  utils.ts  constants.ts
│  ├─ stores/              # zustand persisted stores (user, predictions, bets, social, …)
│  ├─ hooks/               # use-room, use-presence, use-match-clock, …
│  └─ types/               # domain model (index.ts)
├─ supabase/
│  ├─ migrations/0001_init.sql
│  └─ seed.sql
├─ docs/                   # ARCHITECTURE · DEPLOYMENT · DATABASE · TESTING
├─ public/                 # manifest.webmanifest, sw.js, icons
└─ vitest.config.ts
```

---

## ▲ Deploy to Vercel

One‑liner from the repo root:

```bash
npx vercel --prod
```

The app builds without any secrets, so a zero‑config deploy gives you a working demo immediately. Add env vars in the Vercel dashboard to light up live features. Full walkthrough (env vars, optional Supabase / LiveKit / Upstash / API token / Anthropic, custom domain) in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

📚 More docs: **[Architecture](docs/ARCHITECTURE.md)** · **[Database](docs/DATABASE.md)** · **[Testing](docs/TESTING.md)**

---

## 🔞 Responsible gaming

The "Markets" feature uses **play‑coins** (a friendly, non‑withdrawable ledger that starts at a fixed balance) — it is **not a sportsbook** and involves **no real money**. The only money that ever changes hands is **peer‑to‑peer between friends** for friendly challenges (e.g. a coffee), optionally via **UPI**, settled directly between people. Football Fever is **intended for users 18+**. Please play responsibly.

---

## 📄 License

[MIT](LICENSE).

Built with [Claude Code](https://claude.com/claude-code). ⚽️
