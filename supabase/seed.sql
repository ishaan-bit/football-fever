-- ============================================================================
--  Football Fever — optional seed  (seed.sql)
--
--  This is tiny and entirely optional. The application SHIPS ITS OWN SEED
--  DATASET CLIENT-SIDE (src/lib/data/* — 48 teams, 16 venues, a full 104-match
--  fixture list, demo friends, chat history and challenges). That seed is what
--  powers demo mode and needs no database at all.
--
--  Use this file only to put a couple of example rows in a real Supabase
--  project so you can see persistence working end to end. Run it AFTER
--  0001_init.sql and AFTER you have at least one row in auth.users.
--
--  Replace the placeholder UUID below with a real auth.users id from your
--  project (Authentication -> Users), or these inserts will fail the FK check.
-- ============================================================================

-- A demo owner. In a real project this id must already exist in auth.users.
-- e.g. set it to your own user id after signing in once.
\set demo_user '00000000-0000-0000-0000-000000000000'

-- A demo watch group ----------------------------------------------------------
insert into public.watch_groups (id, name, emoji, invite_code, created_by)
values (
  '11111111-1111-1111-1111-111111111111',
  'The Group Chat FC',
  '🏆',
  'FEVER26',
  :'demo_user'
)
on conflict (id) do nothing;

insert into public.group_members (group_id, user_id, role)
values (
  '11111111-1111-1111-1111-111111111111',
  :'demo_user',
  'owner'
)
on conflict (group_id, user_id) do nothing;

-- A couple of friendly challenges --------------------------------------------
-- match_id values mirror the app's knockout fixture ids (see src/lib/data).
insert into public.challenges (id, match_id, kind, title, stake, amount, created_by, participants, status, settlement)
values
  (
    '22222222-2222-2222-2222-222222222222',
    'm-r32-5',
    'coffee',
    'Loser buys the coffee run',
    '1 cold brew ☕️',
    250,
    :'demo_user',
    array[:'demo_user']::uuid[],
    'active',
    '{"method":"upi","settled":false}'::jsonb
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'm-r32-6',
    'pizza',
    'Pizza challenge — closest scoreline wins',
    '1 large pizza 🍕',
    600,
    :'demo_user',
    array[:'demo_user']::uuid[],
    'open',
    '{"method":"upi","settled":false}'::jsonb
  )
on conflict (id) do nothing;
