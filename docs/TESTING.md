# Testing

Football Fever's correctness‑critical surface is its **pure, deterministic domain logic**: The Oracle, the odds engine, prediction scoring, and the data normalize/projection layer. These have no DOM or network dependencies, so they are fast and reliable to unit‑test. The UI and realtime are best covered with a thin layer of component/e2e tests.

The runner is **[Vitest](https://vitest.dev)** (already a dev dependency and wired into `package.json`):

```bash
npm run test        # vitest run  — single pass (CI)
npm run test:watch  # vitest      — watch mode
```

---

## Configuration

[`vitest.config.ts`](../vitest.config.ts) at the repo root mirrors the TypeScript path alias so `@/...` imports resolve in tests:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- The alias matches `tsconfig.json` → `compilerOptions.paths` (`"@/*": ["./src/*"]`).
- The pure modules need no browser, so the default **`node`** environment is used. Add `environment: "jsdom"` (and `@testing-library/react`) only when you start testing components.

Tests live next to the code they cover, named `*.test.ts`.

---

## Unit tests (pure logic)

The example suite covers the three highest‑value modules:

### `src/lib/oracle/engine.test.ts`
- 1X2 probabilities **sum to ~1** (within epsilon) and stay in `[0, 1]`.
- `confidence` stays within the documented **`[25, 96]`** band.
- `expectedGoals` are **positive** for both sides.
- **Determinism** — the same `Match` produces an identical verdict, preview, confidence, scoreline and probabilities (the engine seeds all randomness from the match id).
- A **much stronger team is favoured** (Argentina rating 93 vs Saudi Arabia 69), and the favourite flips correctly when the strong team plays away.
- `null` is returned when a team id is unknown; host context nudges home xG upward.

### `src/lib/betting/odds.test.ts`
- Every priced selection has **decimal odds > 1** and **implied probability in (0, 1)**.
- The core `match_result` market is always present; `to_qualify` appears **only in knockout stages**.
- Implied probabilities **overround above 1** (the margin is baked in).
- `decimalToFractional` returns a `num/den` string (e.g. `3.0 → "2/1"`); `combinedOdds` **multiplies** its legs (and returns `1` for an empty slip).

### `src/lib/predictions/scoring.test.ts`
- A **correct winner pick** on a finished match → `correct: true` and `points > 0` (`base × risk multiplier`); a **wrong pick** → `correct: false`, `points: 0`.
- Points **scale with risk** (Wild > Safe).
- Scoreline / total‑goals / first‑scorer / extra‑time settlement behave as specified.
- An **unfinished match** always scores `0`.
- `marketDefs` **excludes `extra_time` in the group stage** and includes it in knockouts.

### Determinism guarantees
The seed simulator and all engines use a seeded PRNG (`seededRandom`/`hashSeed` in `src/lib/utils.ts`). This is what makes the app SSR‑safe (server and client render identically) **and** makes tests reliable: assert exact values, not ranges. Good additional targets:

- `src/lib/worldcup/normalize.ts` — `normalizeGame/Team/Stadium` and `parseLocalDate` (e.g. `"06/11/2026 16:00"` → correct ISO; `finished`/`time_elapsed` → status mapping).
- `src/lib/data/index.ts` — `statusFromClock` boundaries (44'/46'/halftime/finished) and `projectMatch` knockout team gating (teams hidden until both feeders finish). Pass an explicit `now` to make these deterministic.

---

## Component & e2e (suggested)

Not included in the example suite, but the recommended next layers:

- **Component tests** — add `jsdom` + `@testing-library/react` and cover stateful UI: the bet slip (`stores/bets.ts`), prediction flow (`stores/predictions.ts` settlement), and the chat reducer in `stores/social.ts`.
- **e2e with [Playwright](https://playwright.dev)** — drive the real demo‑mode app (no secrets needed):
  - Onboarding → set name/favorite team.
  - Open a match room → send a chat message → see it appear (and sync across two tabs via `BroadcastChannel`).
  - Make a prediction → see it locked.
  - Build an accumulator in Markets → place a play‑coin bet → balance decrements.
  - Install/PWA smoke check (service worker registers, manifest valid).

Because demo mode is fully functional offline, e2e runs need **no external services**.

---

## CI

A minimal pipeline (e.g. GitHub Actions) on push / PR:

```yaml
# .github/workflows/ci.yml
name: ci
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
      # - run: npm run build   # optional: catch build-time regressions
```

`typecheck` (strict TS) and `test` (Vitest) are the must‑pass gates; lint is informational (the production build does not block on it). Keep the suite fast by favouring the pure‑logic unit tests above — they need no environment, no secrets, and no network.
