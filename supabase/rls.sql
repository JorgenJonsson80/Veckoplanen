-- Security baseline for Veckoplanen.
-- Review table/column names against the live Supabase schema before applying.

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;

drop policy if exists "rooms_select_for_members" on public.rooms;
drop policy if exists "rooms_insert_own_room" on public.rooms;
drop policy if exists "rooms_update_for_members" on public.rooms;
drop policy if exists "rooms_delete_for_creator" on public.rooms;

create policy "rooms_select_for_members"
on public.rooms
for select
to authenticated
using (
  created_by = auth.uid()
  or
  exists (
    select 1
    from public.room_members rm
    where rm.room_id = rooms.id
      and rm.user_id = auth.uid()
  )
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
  or
  exists (
    select 1
    from public.room_members rm
    where rm.room_id = rooms.id
      and rm.user_id = auth.uid()
  )
)
with check (
  created_by = auth.uid()
  or
  exists (
    select 1
    from public.room_members rm
    where rm.room_id = rooms.id
      and rm.user_id = auth.uid()
  )
);

create policy "rooms_delete_for_creator"
on public.rooms
for delete
to authenticated
using (created_by = auth.uid());

drop policy if exists "room_members_select_own_rooms" on public.room_members;
drop policy if exists "room_members_insert_self" on public.room_members;
drop policy if exists "room_members_update_self" on public.room_members;
drop policy if exists "room_members_delete_self_or_creator" on public.room_members;

create policy "room_members_select_own_rooms"
on public.room_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.rooms r
    where r.id = room_members.room_id
      and r.created_by = auth.uid()
  )
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
  or exists (
    select 1
    from public.rooms r
    where r.id = room_members.room_id
      and r.created_by = auth.uid()
  )
);

-- Recommended next hardening step:
-- Move joining by room code into a security definer RPC instead of allowing
-- direct client SELECT on public.rooms by code. The current frontend still
-- reads by code, so apply this after the client is migrated to an RPC flow.
