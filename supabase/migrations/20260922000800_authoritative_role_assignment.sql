alter table public.room_players
  add column role text,
  add constraint room_players_role_check
    check (role is null or role in ('police', 'thief', 'people'));

create or replace function public.start_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  target_room public.rooms%rowtype;
  player_count integer;
  not_ready_count integer;
  assigned_role_count integer;
begin
  select r.*
  into target_room
  from public.rooms as r
  where r.id = p_room_id
  for update;

  if not found then
    raise exception 'Room not found';
  end if;

  if target_room.status <> 'waiting' then
    raise exception 'Room is not waiting';
  end if;

  select count(*)::integer
  into player_count
  from public.room_players as rp
  where rp.room_id = target_room.id;

  if player_count <> 4 then
    raise exception 'Room must have exactly 4 players';
  end if;

  select count(*)::integer
  into not_ready_count
  from public.room_players as rp
  where rp.room_id = target_room.id
    and not rp.is_ready;

  if not_ready_count <> 0 then
    raise exception 'All players must be ready';
  end if;

  select count(*)::integer
  into assigned_role_count
  from public.room_players as rp
  where rp.room_id = target_room.id
    and rp.role is not null;

  if assigned_role_count <> 0 then
    raise exception 'Roles are already assigned';
  end if;

  with randomized_players as (
    select
      rp.user_id,
      row_number() over (order by random()) as role_position
    from public.room_players as rp
    where rp.room_id = target_room.id
  )
  update public.room_players as rp
  set role = case randomized_players.role_position
    when 1 then 'police'
    when 2 then 'thief'
    when 3 then 'people'
    when 4 then 'people'
  end
  from randomized_players
  where rp.room_id = target_room.id
    and rp.user_id = randomized_players.user_id;

  update public.rooms
  set status = 'playing'
  where id = target_room.id;
end;
$$;

create or replace function public.get_my_game_role(p_code text)
returns table (role text)
language plpgsql
security definer
stable
set search_path = public, pg_catalog
as $$
declare
  target_room public.rooms%rowtype;
  player_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select r.*
  into target_room
  from public.rooms as r
  where r.code = upper(trim(p_code));

  if not found then
    raise exception 'Room not found';
  end if;

  if not exists (
    select 1
    from public.room_players as rp
    where rp.room_id = target_room.id
      and rp.user_id = auth.uid()
  ) then
    raise exception 'You are not in this room' using errcode = '42501';
  end if;

  if target_room.status = 'waiting' then
    raise exception 'Room is still waiting';
  end if;

  if target_room.status = 'finished' then
    raise exception 'Room is finished';
  end if;

  if target_room.status <> 'playing' then
    raise exception 'Room is no longer available';
  end if;

  select rp.role
  into player_role
  from public.room_players as rp
  where rp.room_id = target_room.id
    and rp.user_id = auth.uid();

  if player_role is null then
    raise exception 'Role is not assigned';
  end if;

  return query select player_role;
end;
$$;

revoke execute on function public.start_room(uuid) from public, anon, authenticated;
grant execute on function public.start_room(uuid) to service_role;

revoke execute on function public.get_my_game_role(text) from public, anon;
grant execute on function public.get_my_game_role(text) to authenticated;
