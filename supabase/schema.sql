-- Layer: data. Run this in the Supabase SQL editor, then seed.sql.
-- The service role key bypasses RLS. The browser never gets that key.

create table if not exists pot (
  id text primary key,
  balance_pence integer not null,
  cap_pence integer not null,
  bans text[] not null default '{}',
  allow_skus text[] not null default '{}',
  sizes text[] not null default '{}',
  past_orders jsonb not null default '[]'::jsonb
);

create table if not exists catalog (
  sku text primary key,
  name text not null,
  price_pence integer not null,
  tags text[] not null default '{}'
);

create table if not exists ledger (
  id bigint generated always as identity primary key,
  stripe_session_id text not null unique,
  skus jsonb not null,
  amount_pence integer not null,
  created_at timestamptz not null default now()
);

alter table pot enable row level security;
alter table catalog enable row level security;
alter table ledger enable row level security;

create or replace function apply_payment(session_id text, sku_list jsonb, amount integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  balance integer;
begin
  if session_id is null or amount is null or amount <= 0 then
    return false;
  end if;

  perform 1 from pot where id = 'home' for update;

  if exists (select 1 from ledger where stripe_session_id = session_id) then
    return false;
  end if;

  select balance_pence into balance from pot where id = 'home';
  if balance is null or amount > balance then
    return false;
  end if;

  insert into ledger (stripe_session_id, skus, amount_pence)
  values (session_id, sku_list, amount);

  update pot
  set
    balance_pence = balance_pence - amount,
    past_orders = past_orders || sku_list
  where id = 'home';

  return true;
end;
$$;
