-- Step 9 security correction: only the Police player may trigger timeout resolution.

create or replace function public.resolve_expired_round(
  p_code text
)
returns table (
  round_status text,
  round_result text,
  finished_at timestamptz
)
language plpgsql
security definer
volatile
set search_path = public, pg_catalog
as $$
declare
  caller_id uuid := auth.uid();
  target_room public.rooms%rowtype;
  target_round public.game_rounds%rowtype;
  caller_role text;
  resolution_finished_at timestamptz;
begin
  if caller_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select r.*
  into target_room
  from public.rooms as r
  where r.code = upper(trim(p_code))
  for update;

  if not found then
    raise exception 'Room not found';
  end if;

  if not exists (
    select 1
    from public.room_players as rp
    where rp.room_id = target_room.id
      and rp.user_id = caller_id
  ) then
    raise exception 'You are not in this room' using errcode = '42501';
  end if;

  select rp.role
  into caller_role
  from public.room_players as rp
  where rp.room_id = target_room.id
    and rp.user_id = caller_id;

  if caller_role <> 'police' then
    raise exception 'Only Police can resolve an expired round';
  end if;

  select gr.*
  into target_round
  from public.game_rounds as gr
  where gr.room_id = target_room.id
  order by gr.round_number desc
  limit 1
  for update;

  if not found then
    raise exception 'Round is not available';
  end if;

  if target_round.status = 'finished' then
    return query select target_round.status, target_round.result, target_round.finished_at;
    return;
  end if;

  if target_round.status <> 'active' then
    raise exception 'Round is not available';
  end if;

  if pg_catalog.clock_timestamp() < target_round.ends_at then
    raise exception 'Round has not expired';
  end if;

  if exists (
    select 1
    from public.game_accusations as ga
    where ga.round_id = target_round.id
  ) then
    raise exception 'Accusation already recorded';
  end if;

  resolution_finished_at := clock_timestamp();

  update public.game_rounds
  set
    status = 'finished',
    result = 'thief_escaped_timeout',
    finished_at = resolution_finished_at
  where id = target_round.id
    and status = 'active';

  if not found then
    select gr.*
    into target_round
    from public.game_rounds as gr
    where gr.id = target_round.id
    for update;

    if target_round.status = 'finished' then
      return query select target_round.status, target_round.result, target_round.finished_at;
      return;
    end if;

    raise exception 'Round could not be resolved';
  end if;

  update public.rooms
  set status = 'finished'
  where id = target_room.id
    and status = 'playing';

  return query select 'finished'::text, 'thief_escaped_timeout'::text, resolution_finished_at;
end;
$$;

revoke execute on function public.resolve_expired_round(text) from public, anon;
grant execute on function public.resolve_expired_round(text) to authenticated;
