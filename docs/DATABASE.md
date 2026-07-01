# Database

The schema lives in [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) with a tiny optional [`supabase/seed.sql`](../supabase/seed.sql). It is **entirely optional**: the app runs fully in demo mode with bundled client‑side seed data, `BroadcastChannel` realtime and `localStorage` persistence. Apply the schema only when you connect a Supabase project to enable real accounts, cross‑device sync, persistent chat and shared challenges.

This document explains the tables, relationships, Row Level Security, realtime channels, and how each maps to an app feature.

---

## Conventions

- **User ids** are `uuid` and reference Supabase's built‑in `auth.users(id)` (cascade on delete).
- **Match / room / team ids are `text`**, not UUIDs — they mirror the app's data‑layer ids (e.g. `m-r32-1`, `arg`) and the live World Cup API, which are not UUIDs.
- **Row Level Security is enabled on every table.** The default rule: a user reads/writes *their own* rows; group content is visible to members; some tables are publicly readable where the product needs it (profiles, predictions, reactions).
- The migration is **re‑runnable** (`create table if not exists`, `drop policy if exists` → `create policy`, idempotent publication adds).
- An `updated_at` trigger (`set_updated_at()`) keeps `profiles.updated_at` fresh.

---

## Tables

### `profiles` — 1:1 with `auth.users`
The public identity of a signed‑in user. Maps to the app's `UserProfile` and the `user` store.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | → `auth.users(id)` |
| `handle` | `text` unique | e.g. `@ishaan` |
| `name` | `text` | display name |
| `avatar_url` | `text` | |
| `favorite_team_id` | `text` | app team id, e.g. `arg` |
| `upi_id` | `text` | for peer‑to‑peer challenge settlement |
| `vibe` | `text` | short status line |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` via trigger |

**RLS:** public `select`; `insert`/`update` only where `auth.uid() = id`.

### `watch_groups` — a friend group / room owner record
Maps to the app's `WatchGroup`. An `invite_code` (unique) lets friends join.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `name`, `emoji` | `text` | |
| `invite_code` | `text` unique | shareable join code |
| `created_by` | `uuid` | → `auth.users` |
| `created_at` | `timestamptz` | |

**RLS:** readable by the creator or any member (`is_group_member`); only the creator can update/delete.

### `group_members` — membership join table
Composite PK `(group_id, user_id)`. A `role` of `owner`/`admin`/`member`.

**RLS:** a user sees rows for groups they belong to; a user may insert/delete **their own** membership (join/leave).

> A `SECURITY DEFINER` helper `is_group_member(gid)` answers "is the current user in this group?" and is reused across policies (group rooms, messages) without recursion.

### `messages` — room chat
Maps to the app's `ChatMessage` and the `social` store. `room_id` is **free‑form text**: a public match room (`match:m-r32-1`) or a group room (`group:<uuid>`).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `room_id` | `text` | `match:…` or `group:…` |
| `user_id` | `uuid` | → `auth.users` |
| `kind` | `text` enum | `text/gif/voice/reaction/system/ai/prediction/moment` |
| `body` | `text` | |
| `media_url` | `text` | gif/voice url |
| `duration` | `int` | seconds, voice notes |
| `reply_to` | `uuid` | self‑FK (set null on delete) |
| `created_at` | `timestamptz` | |

**Indexes:** `(room_id, created_at)` for room timelines; `(user_id)`.
**RLS:** readable in any `match:%` room, or a `group:%` room the user is a member of; users insert/update/delete **their own** messages.

### `message_reactions` — emoji reactions
Composite PK `(message_id, user_id, emoji)` — one reaction per user/emoji/message. Maps to `ChatMessage.reactions`.

**RLS:** public `select`; users may `insert`/`delete` **their own** reactions.

### `predictions` — the friendly prediction league
Maps to the app's `Prediction` and the `predictions` store. Settled by `scorePrediction` (see [TESTING](TESTING.md) / [ARCHITECTURE](ARCHITECTURE.md)).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` | → `auth.users` |
| `match_id` | `text` | app/API match id |
| `market` | `text` enum | `winner/scoreline/first_scorer/total_goals/cards/corners/clean_sheet/motm/penalty/extra_time` |
| `value` | `text` | the pick, e.g. `home`, `2-1`, `over` |
| `risk` | `text` enum | `safe/balanced/bold/wild` |
| `points` | `int` | awarded on settle |
| `correct` | `boolean` | null until settled |
| `settled` | `boolean` | |
| `created_at` | `timestamptz` | |

**Constraint:** `unique (user_id, match_id, market)` — one pick per market per match.
**Indexes:** `(user_id)`, `(match_id)`.
**RLS:** public `select` (leaderboards and "what did the room pick" views); owner‑only writes.

### `bets` — play‑coin accumulators
Maps to the app's `PlacedBet` and the `bets` store. **Play‑coins only — never real currency.**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` | → `auth.users` |
| `legs` | `jsonb` | `BetSlipLeg[]` |
| `stake` | `int` | `> 0` |
| `combined_odds` | `numeric(8,2)` | product of leg odds |
| `potential_return` | `int` | |
| `status` | `text` enum | `open/won/lost/void` |
| `created_at` | `timestamptz` | |

**RLS:** fully private — owner‑only `select`/`insert`/`update`.

### `challenges` — friendly peer‑to‑peer wagers
Maps to the app's `FriendlyChallenge`. Coffee/pizza/bragging‑rights bets between friends, settled IRL or via **UPI**.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `match_id` | `text` | |
| `kind` | `text` enum | `coffee/pizza/restaurant/dare/bragging/host/custom` |
| `title`, `stake` | `text` | `stake` is a human label, e.g. `1 large pizza 🍕` |
| `amount` | `int` | optional money amount for UPI settlement |
| `created_by` | `uuid` | → `auth.users` |
| `participants` | `uuid[]` | array of user ids |
| `winner_id` | `uuid` | → `auth.users` (set null on delete) |
| `status` | `text` enum | `open/active/settled/cancelled` |
| `settlement` | `jsonb` | `{ method, settled, upiId }` |
| `created_at` | `timestamptz` | |

**Indexes:** `(match_id)`, `(created_by)`.
**RLS:** readable by the creator or any participant (`auth.uid() = any(participants)`); creator inserts/cancels; creator or participants may update (to record settlement / nominate a winner).

---

## Relationships

```
auth.users ──1:1── profiles
auth.users ──1:N── watch_groups (created_by)
watch_groups ──1:N── group_members ──N:1── auth.users
auth.users ──1:N── messages ──N:1── messages (reply_to, self)
messages ──1:N── message_reactions ──N:1── auth.users
auth.users ──1:N── predictions
auth.users ──1:N── bets
auth.users ──1:N── challenges (created_by);  challenges.participants[] → auth.users
```

`messages.room_id` is not a foreign key — it is a logical room id (`match:<id>` or `group:<uuid>`). Group‑room access is enforced in the RLS policy by extracting the uuid from the `group:<uuid>` id and checking membership.

---

## Realtime channels

Only the chat surfaces need row‑level realtime. The migration adds two tables to the `supabase_realtime` publication:

```sql
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table message_reactions;
```

Clients subscribe to `INSERT/UPDATE/DELETE` on these to drive live chat and live reactions in a room.

### Presence is **ephemeral** — not a table
"Who's watching / typing / in the call" is handled by **Supabase Realtime Presence** (a per‑channel, in‑memory presence map), and in demo mode by **`BroadcastChannel`** + a friend‑activity simulation (`src/hooks/use-presence.ts`). There is deliberately **no presence table** — presence state should not be persisted.

---

## Feature → table map

| App feature | Backed by |
| --- | --- |
| Profile, favorite team, UPI id | `profiles` |
| Watch groups & invites | `watch_groups`, `group_members` |
| Room chat (match & group), pins, AI host lines, voice/gif | `messages` |
| Reactions | `message_reactions` |
| Prediction league, leaderboard, accuracy/streak | `predictions` |
| Play‑coin markets / accumulators | `bets` |
| Friendly challenges + UPI settlement | `challenges` |
| Presence (watching/typing/in‑call) | *ephemeral* — Realtime Presence / `BroadcastChannel` |
| Live fixtures, scores, the Oracle, odds | *not in DB* — World Cup API / seed dataset + pure engines |

> Tournament data (teams, venues, fixtures, scores) and the derived engines (Oracle, odds, scoring) are **not** stored in Postgres — they come from the World Cup API or the bundled seed and are computed at read‑time. The database holds only **user‑generated** data.
