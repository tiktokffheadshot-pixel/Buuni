create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  host_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'waiting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_code_format check (code ~ '^[A-Z0-9]{6}$'),
  constraint rooms_status_check check (status in ('waiting', 'playing', 'finished'))
);

create unique index rooms_code_unique on public.rooms (code);
create index rooms_host_id_idx on public.rooms (host_id);
create index rooms_status_created_at_idx on public.rooms (status, created_at desc);

create table public.room_players (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  is_ready boolean not null default false,
  primary key (room_id, user_id)
);

create index room_players_user_id_idx on public.room_players (user_id);
create index room_players_room_id_joined_at_idx on public.room_players (room_id, joined_at);

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

revoke all on table public.rooms from anon, authenticated;
revoke all on table public.room_players from anon, authenticated;

grant select on table public.rooms to authenticated;
grant select on table public.room_players to authenticated;

create policy "Participants can view their room"
  on public.rooms
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.room_players
      where room_players.room_id = rooms.id
        and room_players.user_id = (select auth.uid())
    )
  );

create policy "Participants can view room players"
  on public.room_players
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.room_players as membership
      where membership.room_id = room_players.room_id
        and membership.user_id = (select auth.uid())
    )
  );

create or replace function public.set_room_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_room_updated_at() from public, anon, authenticated;

create trigger rooms_set_updated_at
  before update on public.rooms
  for each row
  execute function public.set_room_updated_at();

create or replace function public.create_room()
returns table (room_id uuid, room_code text)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  new_room_id uuid;
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  loop
    new_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.rooms where code = new_code);
  end loop;

  insert into public.rooms (code, host_id)
  values (new_code, auth.uid())
  returning id into new_room_id;

  insert into public.room_players (room_id, user_id, is_ready)
  values (new_room_id, auth.uid(), true);

  return query select new_room_id, new_code;
end;
$$;

create or replace function public.join_room(p_code text)
returns table (room_id uuid, room_code text)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  target_room public.rooms%rowtype;
  player_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into target_room
  from public.rooms
  where code = upper(trim(p_code))
  for update;

  if not found then raise exception 'Room not found'; end if;
  if target_room.status <> 'waiting' then raise exception 'Room is no longer accepting players'; end if;

  if exists (
    select 1 from public.room_players
    where room_id = target_room.id and user_id = auth.uid()
  ) then
    return query select target_room.id, target_room.code;
    return;
  end if;

  select count(*)::integer into player_count
  from public.room_players
  where room_id = target_room.id;

  if player_count >= 4 then raise exception 'Room is full'; end if;

  insert into public.room_players (room_id, user_id)
  values (target_room.id, auth.uid());

  return query select target_room.id, target_room.code;
end;
$$;

create or replace function public.leave_room(p_code text)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  target_room public.rooms%rowtype;
  next_host uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;

  select * into target_room
  from public.rooms
  where code = upper(trim(p_code))
  for update;

  if not found then raise exception 'Room not found'; end if;

  if not exists (
    select 1 from public.room_players
    where room_id = target_room.id and user_id = auth.uid()
  ) then
    raise exception 'You are not in this room' using errcode = '42501';
  end if;

  delete from public.room_players
  where room_id = target_room.id and user_id = auth.uid();

  if target_room.host_id = auth.uid() then
    select user_id into next_host
    from public.room_players
    where room_id = target_room.id
    order by joined_at
    limit 1;

    if next_host is null then
      delete from public.rooms where id = target_room.id;
    else
      update public.rooms set host_id = next_host where id = target_room.id;
    end if;
  end if;
end;
$$;

create or replace function public.set_room_ready(p_code text, p_ready boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  target_room_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;

  select id into target_room_id
  from public.rooms
  where code = upper(trim(p_code)) and status = 'waiting';

  if target_room_id is null then raise exception 'Waiting room not found'; end if;

  update public.room_players
  set is_ready = p_ready
  where room_id = target_room_id and user_id = auth.uid();

  if not found then raise exception 'You are not in this room' using errcode = '42501'; end if;
end;
$$;

create or replace function public.get_room_waiting_data(p_code text)
returns table (
  room_id uuid,
  room_code text,
  room_status text,
  host_id uuid,
  user_id uuid,
  username text,
  joined_at timestamptz,
  is_ready boolean,
  is_host boolean
)
language plpgsql
security definer
stable
set search_path = public, pg_catalog
as $$
declare
  target_room public.rooms%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;

  select * into target_room
  from public.rooms
  where code = upper(trim(p_code));

  if not found then raise exception 'Room not found'; end if;

  if not exists (
    select 1 from public.room_players
    where room_id = target_room.id and user_id = auth.uid()
  ) then
    raise exception 'You are not in this room' using errcode = '42501';
  end if;

  return query
  select target_room.id, target_room.code, target_room.status, target_room.host_id,
         rp.user_id, coalesce(p.username, 'Player'), rp.joined_at, rp.is_ready,
         rp.user_id = target_room.host_id
  from public.room_players rp
  left join public.profiles p on p.id = rp.user_id
  where rp.room_id = target_room.id
  order by rp.joined_at;
end;
$$;

revoke execute on function public.create_room() from public, anon;
revoke execute on function public.join_room(text) from public, anon;
revoke execute on function public.leave_room(text) from public, anon;
revoke execute on function public.set_room_ready(text, boolean) from public, anon;
revoke execute on function public.get_room_waiting_data(text) from public, anon;

grant execute on function public.create_room() to authenticated;
grant execute on function public.join_room(text) to authenticated;
grant execute on function public.leave_room(text) to authenticated;
grant execute on function public.set_room_ready(text, boolean) to authenticated;
grant execute on function public.get_room_waiting_data(text) to authenticated;
