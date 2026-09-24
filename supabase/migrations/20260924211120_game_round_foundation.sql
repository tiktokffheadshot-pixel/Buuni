create table public.game_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references public.rooms(id) on delete cascade,
  round_number integer not null default 1,
  status text not null default 'active',
  started_at timestamptz not null,
  ends_at timestamptz not null,
  constraint game_rounds_round_number_check check (round_number >= 1),
  constraint game_rounds_status_check check (status in ('active', 'finished')),
  constraint game_rounds_time_order_check check (ends_at > started_at)
);

create index game_rounds_room_id_idx on public.game_rounds(room_id);

alter table public.game_rounds enable row level security;

revoke all on table public.game_rounds from public, anon, authenticated;

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
    round_started_at + interval '60 seconds'
  );

  update public.rooms
  set status = 'playing'
  where id = target_room.id;
end;
$$;

create or replace function public.get_game_round_data(p_code text)
returns table (
  room_id uuid,
  room_code text,
  room_status text,
  host_id uuid,
  round_id uuid,
  round_number integer,
  round_status text,
  round_started_at timestamptz,
  round_ends_at timestamptz,
  round_expired boolean,
  user_id uuid,
  username text,
  joined_at timestamptz,
  is_host boolean
)
language plpgsql
security definer
stable
set search_path = public, pg_catalog
as $$
declare
  target_room public.rooms%rowtype;
  target_round public.game_rounds%rowtype;
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

  select gr.*
  into target_round
  from public.game_rounds as gr
  where gr.room_id = target_room.id
  order by gr.round_number desc
  limit 1;

  if not found then
    raise exception 'Game round is not available';
  end if;

  return query
  select
    target_room.id,
    target_room.code,
    target_room.status,
    target_room.host_id,
    target_round.id,
    target_round.round_number,
    target_round.status,
    target_round.started_at,
    target_round.ends_at,
    clock_timestamp() >= target_round.ends_at,
    rp.user_id,
    coalesce(p.username, 'Player'),
    rp.joined_at,
    rp.user_id = target_room.host_id
  from public.room_players as rp
  left join public.profiles as p on p.id = rp.user_id
  where rp.room_id = target_room.id
  order by rp.joined_at;
end;
$$;

revoke execute on function public.start_room(uuid) from public, anon, authenticated;
grant execute on function public.start_room(uuid) to service_role;

revoke execute on function public.get_game_round_data(text) from public, anon;
grant execute on function public.get_game_round_data(text) to authenticated;
