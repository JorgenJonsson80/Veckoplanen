-- Push-prenumerationer för daglig middagsnotis
-- Kör detta i Supabase SQL-editorn

create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  room_code text not null,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz default now()
);

-- RLS: alla inloggade kan lägga till sin prenumeration,
-- service role (cron) läser alla via service key (kringgår RLS)
alter table public.push_subscriptions enable row level security;

drop policy if exists "push_sub_insert" on public.push_subscriptions;
create policy "push_sub_insert"
  on public.push_subscriptions
  for insert
  to authenticated
  with check (true);

-- Index för snabb lookup per rum
create index if not exists push_subscriptions_room_code_idx
  on public.push_subscriptions (room_code);
