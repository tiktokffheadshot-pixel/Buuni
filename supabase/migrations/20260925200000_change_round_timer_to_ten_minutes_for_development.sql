-- Step 8 development timer: keep the round duration in one database configuration function.

create or replace function public.round_duration_seconds()
returns integer
language sql
immutable
as $$
  select 600;
$$;

revoke execute on function public.round_duration_seconds() from public, anon, authenticated;

alter table public.game_rounds
  drop constraint if exists game_rounds_exact_sixty_seconds_check;

alter table public.game_rounds
  add constraint game_rounds_exact_round_duration_check
  check (
    ends_at = started_at + (public.round_duration_seconds() * interval '1 second')
  ) not valid;

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
  round_count integer;
  round_started_at timestamptz := clock_timestamp();
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

  select count(*)::integer
  into round_count
  from public.game_rounds as gr
  where gr.room_id = target_room.id;

  if round_count <> 0 then
    raise exception 'Game round already exists';
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

  insert into public.game_rounds (
    room_id,
    round_number,
    status,
    started_at,
    ends_at
  )
  values (
    target_room.id,
    1,
    'active',
    round_started_at,
    round_started_at + (public.round_duration_seconds() * interval '1 second')
  );

  update public.rooms
  set status = 'playing'
  where id = target_room.id;
end;
$$;

revoke execute on function public.start_room(uuid) from public, anon, authenticated;
grant execute on function public.start_room(uuid) to service_role;
