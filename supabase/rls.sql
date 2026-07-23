-- Security baseline for Veckoplanen.
-- Review table/column names against the live Supabase schema before applying.

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;

alter table public.rooms add column if not exists name text;

drop index if exists room_members_room_id_user_id_idx;
alter table public.room_members
  drop constraint if exists room_members_room_id_user_id_key;
alter table public.room_members
  add constraint room_members_room_id_user_id_key unique (room_id, user_id);

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

drop trigger if exists rooms_limit_trigger on public.rooms;
drop trigger if exists room_members_limit_trigger on public.room_members;
drop function if exists public.check_room_limit();
drop function if exists public.check_member_limit();
drop function if exists public.is_room_member(uuid);
drop function if exists public.is_room_creator(uuid);
drop function if exists public.join_room_by_code(text, text);

create or replace function public.check_room_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.rooms where created_by = new.created_by) >= 5 then
    raise exception 'Max 5 rum per användare';
  end if;
  return new;
end;
$$;

create trigger rooms_limit_trigger
before insert on public.rooms
for each row execute function public.check_room_limit();

create or replace function public.check_member_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.room_members where room_id = new.room_id) >= 20 then
    raise exception 'Rummet är fullt (max 20 medlemmar)';
  end if;
  return new;
end;
$$;

create trigger room_members_limit_trigger
before insert on public.room_members
for each row execute function public.check_member_limit();

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

create or replace function public.join_room_by_code(join_code text, display_name text)
returns table(joined_room_id uuid, room_state jsonb, room_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_code text := upper(trim(join_code));
  clean_name text := left(coalesce(nullif(trim(display_name), ''), 'Användare'), 100);
  found_room record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select r.id, r.state, r.name
  into found_room
  from public.rooms r
  where r.code = clean_code
  limit 1;

  if found_room.id is null then
    return;
  end if;

  insert into public.room_members(room_id, user_id, display_name)
  values(found_room.id, auth.uid(), clean_name)
  on conflict on constraint room_members_room_id_user_id_key
  do update set display_name = excluded.display_name;

  return query select found_room.id, found_room.state::jsonb, found_room.name;
end;
$$;

grant execute on function public.join_room_by_code(text, text) to authenticated;

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

-- Joining by room code is intentionally handled by public.join_room_by_code
-- so clients do not need direct SELECT access to rooms by code before
-- membership exists.
