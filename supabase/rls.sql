-- Security baseline for Veckoplanen.
-- Review table/column names against the live Supabase schema before applying.

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;

drop policy if exists "rooms_select" on public.rooms;
drop policy if exists "rooms_update" on public.rooms;
drop policy if exists "rooms_select_for_members" on public.rooms;
drop policy if exists "rooms_insert_own_room" on public.rooms;
drop policy if exists "rooms_update_for_members" on public.rooms;
drop policy if exists "rooms_delete_for_creator" on public.rooms;

drop policy if exists "room_members_select" on public.room_members;
drop policy if exists "room_members_insert" on public.room_members;
drop policy if exists "room_members_update" on public.room_members;
drop policy if exists "room_members_delete" on public.room_members;
drop policy if exists "room_members_select_own_rooms" on public.room_members;
drop policy if exists "room_members_insert_self" on public.room_members;
drop policy if exists "room_members_update_self" on public.room_members;
drop policy if exists "room_members_delete_self_or_creator" on public.room_members;

drop function if exists public.is_room_member(uuid);
drop function if exists public.is_room_creator(uuid);

create or replace function public.is_room_member(check_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_members rm
    where rm.room_id = check_room_id
      and rm.user_id = auth.uid()
  );
$$;

create or replace function public.is_room_creator(check_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rooms r
    where r.id = check_room_id
      and r.created_by = auth.uid()
  );
$$;

grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.is_room_creator(uuid) to authenticated;

create policy "rooms_select_for_members"
on public.rooms
for select
to authenticated
using (
  created_by = auth.uid()
  or public.is_room_member(rooms.id)
);

create policy "rooms_insert_own_room"
on public.rooms
for insert
to authenticated
with check (created_by = auth.uid());

create policy "rooms_update_for_members"
on public.rooms
for update
to authenticated
using (
  created_by = auth.uid()
  or public.is_room_member(rooms.id)
)
with check (
  created_by = auth.uid()
  or public.is_room_member(rooms.id)
);

create policy "rooms_delete_for_creator"
on public.rooms
for delete
to authenticated
using (created_by = auth.uid());

create policy "room_members_select_own_rooms"
on public.room_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_room_creator(room_members.room_id)
);

create policy "room_members_insert_self"
on public.room_members
for insert
to authenticated
with check (user_id = auth.uid());

create policy "room_members_update_self"
on public.room_members
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "room_members_delete_self_or_creator"
on public.room_members
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_room_creator(room_members.room_id)
);

-- Recommended next hardening step:
-- Move joining by room code into a security definer RPC instead of allowing
-- direct client SELECT on public.rooms by code. The current frontend still
-- reads by code, so apply this after the client is migrated to an RPC flow.
