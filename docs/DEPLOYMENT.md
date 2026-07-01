# Deployment

Football Fever deploys to **Vercel** and builds with **zero secrets** — a bare deploy gives you a fully working demo immediately. You then add environment variables to progressively light up live features. This guide covers the base deploy and each optional integration.

> Prerequisites: Node **20+**, a Vercel account, and (optionally) accounts for Supabase / LiveKit / Upstash / Anthropic and the World Cup API.

---

## 1. Deploy to Vercel

### Option A — CLI (fastest)

```bash
npm i -g vercel        # if you don't have it
vercel login

# from the repo root
vercel                 # creates/links the project, deploys a preview
vercel --prod          # promote to production
```

### Option B — Dashboard

1. Push the repo to GitHub/GitLab/Bitbucket.
2. In Vercel → **Add New… → Project** → import the repo.
3. Framework preset auto‑detects **Next.js**. Defaults are correct:
   - Build command: `next build`
   - Output: handled by the Next.js adapter
   - Install command: `npm install`
4. Click **Deploy**. With no env vars set, the app ships in demo mode.

> `next.config.mjs` sets `eslint.ignoreDuringBuilds: true`, so lint never blocks a production build (lint runs separately — `npm run lint`). It also allowlists the remote image CDNs and sets the service‑worker headers.

---

## 2. Set environment variables

Every variable is optional. Add only the groups you want. In the dashboard: **Project → Settings → Environment Variables** (set for **Production**, **Preview**, **Development** as needed). Or via CLI:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# repeat per variable, or:
vercel env pull .env.local      # pull existing env into a local file
```

Recommended baseline (even in demo mode):

```bash
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
NEXT_PUBLIC_APP_NAME="Football Fever"
NEXT_PUBLIC_DEFAULT_TZ="Asia/Kolkata"
```

See the full variable reference in [`README.md`](../README.md#-environment-variables) and the canonical list in [`.env.example`](../.env.example). Redeploy after changing env vars (`vercel --prod`, or "Redeploy" in the dashboard).

---

## 3. Optional — Supabase (auth, Postgres, Realtime, Presence)

1. Create a project at <https://supabase.com>.
2. Grab the values from **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server‑only**, never expose to the client)
3. Run the schema migration. With the **Supabase CLI**:

   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push          # applies supabase/migrations/0001_init.sql
   ```

   Or paste `supabase/migrations/0001_init.sql` into the **SQL Editor** in the dashboard and run it. (Optionally run `supabase/seed.sql` after editing the placeholder user id — see its header.)
4. **Enable Realtime.** The migration already adds `messages` and `message_reactions` to the `supabase_realtime` publication. Confirm under **Database → Replication / Publications** that `supabase_realtime` includes them. Presence (who's watching) is handled by **Supabase Realtime Presence** and needs no table.
5. Add the three env vars in Vercel and redeploy.

> Row Level Security is enabled on every table by the migration. See [`docs/DATABASE.md`](DATABASE.md) for the policy model.

---

## 4. Optional — LiveKit (voice & group video)

1. Create a project at <https://cloud.livekit.io>.
2. From the project settings copy:
   - WebSocket URL (e.g. `wss://your-project.livekit.cloud`) → `NEXT_PUBLIC_LIVEKIT_URL`
   - API Key → `LIVEKIT_API_KEY`
   - API Secret → `LIVEKIT_API_SECRET` (**server‑only**)
3. Add the vars in Vercel and redeploy. The app's server action `createCallToken()` mints short‑lived join tokens; without these vars the call UI falls back to a local‑media mock.

---

## 5. Optional — Upstash Redis (leaderboards, rate limiting, cache)

1. Create a Redis database at <https://console.upstash.com>.
2. From **REST API** copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. Add the vars in Vercel and redeploy. Without them, an in‑memory (per‑instance, non‑persistent) store is used.

---

## 6. Optional — World Cup API token (live data)

The live data source is the worldcup2026 API (`https://worldcup26.ir`).

**Mint a token** (valid ~84 days):

```bash
curl -X POST https://worldcup26.ir/auth/authenticate \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}'
# → { "token": "eyJ..." }
```

Then either:

- paste the token directly:

  ```bash
  WORLDCUP_API_TOKEN="eyJ..."
  ```

- **or** let the app auto‑mint and cache it from credentials:

  ```bash
  WORLDCUP_API_EMAIL="YOUR_EMAIL"
  WORLDCUP_API_PASSWORD="YOUR_PASSWORD"
  ```

Optionally tune `NEXT_PUBLIC_LIVE_POLL_MS` (default `20000`). When configured, the app serves live teams/venues/fixtures/scores and falls back to seed if the API is unreachable.

---

## 7. Optional — Anthropic (AI host commentary)

1. Get a key from <https://console.anthropic.com>.
2. Set:

   ```bash
   ANTHROPIC_API_KEY="sk-ant-..."
   ANTHROPIC_MODEL="claude-opus-4-8"   # optional override
   ```

3. Redeploy. Without a key, the AI host uses its built‑in deterministic personality engine (which only reacts to verified match data — it never fabricates events).

---

## 8. PWA / install notes

- The service worker (`public/sw.js`) is served with `Cache-Control: public, max-age=0, must-revalidate` and `Service-Worker-Allowed: /` (configured in `next.config.mjs`), so updates roll out promptly.
- The web manifest (`public/manifest.webmanifest`) marks the app installable (standalone display, theme `#06070D`, home‑screen shortcuts).
- **Install:** desktop Chrome/Edge show an install icon in the address bar; on iOS Safari use **Share → Add to Home Screen**. The app then launches full‑screen.
- HTTPS is required for service workers — Vercel provides this automatically.

---

## 9. Custom domain

1. Vercel → **Project → Settings → Domains → Add** your domain.
2. Add the DNS records Vercel shows (an `A`/`ALIAS` for the apex or a `CNAME` for a subdomain). TLS is provisioned automatically.
3. Update `NEXT_PUBLIC_APP_URL` to the new domain and redeploy so canonical URLs, Open Graph `metadataBase`, and the manifest `start_url` resolve correctly.

---

## 10. Post‑deploy checklist

- [ ] App loads and the demo dataset renders (works with zero env vars).
- [ ] `NEXT_PUBLIC_APP_URL` matches the deployed URL.
- [ ] (If Supabase) migration applied; `messages`/`message_reactions` in the `supabase_realtime` publication; RLS on.
- [ ] (If LiveKit) joining a room negotiates a real call rather than the mock.
- [ ] PWA installable; service worker active in DevTools → Application.
- [ ] `npm run typecheck` and `npm run test` pass in CI before promoting to production.
