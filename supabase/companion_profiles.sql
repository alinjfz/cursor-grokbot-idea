-- Server-owned companion memory. Browser clients cannot query this table directly.
-- Apply once in the Supabase SQL editor or with the project's Postgres connection.

create table if not exists public.companion_profiles (
  profile_id text primary key check (profile_id ~ '^[a-f0-9]{64}$'),
  name text not null check (char_length(name) between 1 and 40),
  interests text not null check (char_length(interests) between 3 and 180),
  avoid text not null default '' check (char_length(avoid) <= 120),
  budget_pence integer not null check (budget_pence between 500 and 200000),
  reminder_time time,
  seen_ids text[] not null default '{}',
  liked_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companion_profiles enable row level security;
revoke all on public.companion_profiles from anon, authenticated;
grant select, insert, update, delete on public.companion_profiles to service_role;
