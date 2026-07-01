-- ============================================================================
--  Football Fever — initial schema  (0001_init.sql)
--
--  This migration is OPTIONAL. The app runs fully in demo mode with bundled
--  seed data, BroadcastChannel realtime and localStorage persistence. Apply
--  this only when you connect a Supabase project to light up real accounts,
--  cross-device sync, persistent chat and shared challenges.
--
--  Design notes
--  ------------
--  * `id` columns reference Supabase's built-in `auth.users`.
--  * Match / room ids are TEXT — they mirror the app's data layer ids
--    (e.g. "m-r32-1", "arg") and the live World Cup API, which are not UUIDs.
--  * Presence is EPHEMERAL — it lives in Supabase Realtime Presence (or the
--    BroadcastChannel fallback), never in a table. There is no presence table.
--  * Row Level Security is enabled on every table. Policies follow the rule:
--    a user reads/writes their own rows; group content is visible to members;
--    leaderboard-style public reads are allowed where it makes sense.
--  * Statements are written to be re-runnable (IF NOT EXISTS / DROP ... IF EXISTS).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Shared helper: keep an updated_at column fresh on UPDATE.
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
--  profiles — one row per authenticated user, 1:1 with auth.users
-- ============================================================================
create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  handle           text unique not null,
  name             text not null,
  avatar_url       text,
  favorite_team_id text,                       -- app team id, e.g. "arg"
  upi_id           text,                        -- for peer-to-peer challenge settlement
  vibe             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists profiles_handle_idx on public.profiles (handle);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable"
  on public.profiles for select using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ============================================================================
--  watch_groups — a friend group / room owner record
-- ============================================================================
create table if not exists public.watch_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  emoji       text not null default '⚽️',
  invite_code text unique not null,
  created_by  uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists watch_groups_created_by_idx on public.watch_groups (created_by);
create index if not exists watch_groups_invite_code_idx on public.watch_groups (invite_code);

alter table public.watch_groups enable row level security;

-- ============================================================================
--  group_members — membership join table (group_id × user_id)
-- ============================================================================
create table if not exists public.group_members (
  group_id  uuid not null references public.watch_groups (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_members_user_idx on public.group_members (user_id);

alter table public.group_members enable row level security;

-- Helper: is the current user a member of a given group? SECURITY DEFINER so
-- it can be referenced inside group_members policies without recursion.
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = gid and gm.user_id = auth.uid()
  );
$$;

-- watch_groups policies (now that the membership helper exists)
drop policy if exists "members read their groups" on public.watch_groups;
create policy "members read their groups"
  on public.watch_groups for select
  using (created_by = auth.uid() or public.is_group_member(id));

drop policy if exists "users create groups" on public.watch_groups;
create policy "users create groups"
  on public.watch_groups for insert with check (created_by = auth.uid());

drop policy if exists "owners update groups" on public.watch_groups;
create policy "owners update groups"
  on public.watch_groups for update using (created_by = auth.uid());

drop policy if exists "owners delete groups" on public.watch_groups;
create policy "owners delete groups"
  on public.watch_groups for delete using (created_by = auth.uid());

-- group_members policies
drop policy if exists "members read membership" on public.group_members;
create policy "members read membership"
  on public.group_members for select
  using (user_id = auth.uid() or public.is_group_member(group_id));

drop policy if exists "users join groups" on public.group_members;
create policy "users join groups"
  on public.group_members for insert with check (user_id = auth.uid());

drop policy if exists "users leave groups" on public.group_members;
create policy "users leave groups"
  on public.group_members for delete using (user_id = auth.uid());

-- ============================================================================
--  messages — chat in a room. room_id is a TEXT id: either a match room
--  ("match:m-r32-1") or a group room ("group:<uuid>"). The app keys rooms
--  by these ids; we keep room_id free-form text for that flexibility.
-- ============================================================================
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  room_id    text not null,
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null default 'text'
               check (kind in ('text','gif','voice','reaction','system','ai','prediction','moment')),
  body       text not null default '',
  media_url  text,
  duration   int,                               -- seconds, for voice notes
  reply_to   uuid references public.messages (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists messages_room_created_idx on public.messages (room_id, created_at);
create index if not exists messages_user_idx on public.messages (user_id);

alter table public.messages enable row level security;

-- Readable in any room that is a public match room ("match:...") or a group
-- room the user belongs to. Authenticated users may post as themselves.
drop policy if exists "read room messages" on public.messages;
create policy "read room messages"
  on public.messages for select
  using (
    room_id like 'match:%'
    or (room_id like 'group:%'
        and public.is_group_member(nullif(split_part(room_id, ':', 2), '')::uuid))
  );

drop policy if exists "post own messages" on public.messages;
create policy "post own messages"
  on public.messages for insert with check (user_id = auth.uid());

drop policy if exists "edit own messages" on public.messages;
create policy "edit own messages"
  on public.messages for update using (user_id = auth.uid());

drop policy if exists "delete own messages" on public.messages;
create policy "delete own messages"
  on public.messages for delete using (user_id = auth.uid());

-- ============================================================================
--  message_reactions — emoji reactions on a message (one per user/emoji)
-- ============================================================================
create table if not exists public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create index if not exists message_reactions_message_idx on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;

drop policy if exists "reactions are readable" on public.message_reactions;
create policy "reactions are readable"
  on public.message_reactions for select using (true);

drop policy if exists "react as self" on public.message_reactions;
create policy "react as self"
  on public.message_reactions for insert with check (user_id = auth.uid());

drop policy if exists "unreact as self" on public.message_reactions;
create policy "unreact as self"
  on public.message_reactions for delete using (user_id = auth.uid());

-- ============================================================================
--  predictions — the friendly prediction league
-- ============================================================================
create table if not exists public.predictions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  match_id   text not null,                     -- app/API match id
  market     text not null
               check (market in ('winner','scoreline','first_scorer','total_goals',
                                 'cards','corners','clean_sheet','motm','penalty','extra_time')),
  value      text not null,
  risk       text not null default 'balanced'
               check (risk in ('safe','balanced','bold','wild')),
  points     int not null default 0,
  correct    boolean,                           -- null until settled
  settled    boolean not null default false,
  created_at timestamptz not null default now(),
  -- a user holds at most one open pick per match+market
  unique (user_id, match_id, market)
);

create index if not exists predictions_user_idx on public.predictions (user_id);
create index if not exists predictions_match_idx on public.predictions (match_id);

alter table public.predictions enable row level security;

-- Predictions are publicly readable (the leaderboard and "what did the room
-- pick" views need them) but only the owner can write them.
drop policy if exists "predictions are readable" on public.predictions;
create policy "predictions are readable"
  on public.predictions for select using (true);

drop policy if exists "insert own predictions" on public.predictions;
create policy "insert own predictions"
  on public.predictions for insert with check (user_id = auth.uid());

drop policy if exists "update own predictions" on public.predictions;
create policy "update own predictions"
  on public.predictions for update using (user_id = auth.uid());

drop policy if exists "delete own predictions" on public.predictions;
create policy "delete own predictions"
  on public.predictions for delete using (user_id = auth.uid());

-- ============================================================================
--  bets — play-coin accumulator slips (never real currency)
-- ============================================================================
create table if not exists public.bets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  legs             jsonb not null default '[]'::jsonb,  -- BetSlipLeg[]
  stake            int not null check (stake > 0),
  combined_odds    numeric(8,2) not null,
  potential_return int not null,
  status           text not null default 'open'
                     check (status in ('open','won','lost','void')),
  created_at       timestamptz not null default now()
);

create index if not exists bets_user_idx on public.bets (user_id);

alter table public.bets enable row level security;

drop policy if exists "read own bets" on public.bets;
create policy "read own bets"
  on public.bets for select using (user_id = auth.uid());

drop policy if exists "place own bets" on public.bets;
create policy "place own bets"
  on public.bets for insert with check (user_id = auth.uid());

drop policy if exists "settle own bets" on public.bets;
create policy "settle own bets"
  on public.bets for update using (user_id = auth.uid());

-- ============================================================================
--  challenges — friendly peer-to-peer wagers (coffee, pizza, bragging rights)
--  settled IRL or via UPI. participants is an array of user ids.
-- ============================================================================
create table if not exists public.challenges (
  id           uuid primary key default gen_random_uuid(),
  match_id     text not null,
  kind         text not null default 'custom'
                 check (kind in ('coffee','pizza','restaurant','dare','bragging','host','custom')),
  title        text not null,
  stake        text not null,                   -- human label, e.g. "1 large pizza 🍕"
  amount       int,                             -- optional money amount for UPI settlement
  created_by   uuid not null references auth.users (id) on delete cascade,
  participants uuid[] not null default '{}',
  winner_id    uuid references auth.users (id) on delete set null,
  status       text not null default 'open'
                 check (status in ('open','active','settled','cancelled')),
  settlement   jsonb,                           -- { method, settled, upiId }
  created_at   timestamptz not null default now()
);

create index if not exists challenges_match_idx on public.challenges (match_id);
create index if not exists challenges_created_by_idx on public.challenges (created_by);

alter table public.challenges enable row level security;

-- Readable by the creator or any participant; writable by the creator;
-- participants may update (to record settlement / nominate a winner).
drop policy if exists "read involved challenges" on public.challenges;
create policy "read involved challenges"
  on public.challenges for select
  using (created_by = auth.uid() or auth.uid() = any (participants));

drop policy if exists "create own challenges" on public.challenges;
create policy "create own challenges"
  on public.challenges for insert with check (created_by = auth.uid());

drop policy if exists "update involved challenges" on public.challenges;
create policy "update involved challenges"
  on public.challenges for update
  using (created_by = auth.uid() or auth.uid() = any (participants));

drop policy if exists "cancel own challenges" on public.challenges;
create policy "cancel own challenges"
  on public.challenges for delete using (created_by = auth.uid());

-- ============================================================================
--  Realtime — broadcast row changes for the live chat surfaces.
--  Adding tables to the supabase_realtime publication lets the client
--  subscribe to INSERT/UPDATE/DELETE on them. Presence (who's watching) is
--  handled separately by Supabase Realtime Presence — not via a table.
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_reactions'
  ) then
    alter publication supabase_realtime add table public.message_reactions;
  end if;
end
$$;
