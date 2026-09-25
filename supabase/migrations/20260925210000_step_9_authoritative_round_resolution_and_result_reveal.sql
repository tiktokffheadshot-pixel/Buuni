-- Step 9: authoritative round resolution and public result reveal.

alter table public.game_rounds
  add column result text,
  add column accused_user_id uuid references auth.users(id) on delete set null,
  add column finished_at timestamptz;

alter table public.game_rounds
  add constraint game_rounds_result_check
  check (
    result is null
    or result in ('police_caught_thief', 'police_wrong_accusation', 'thief_escaped_timeout')
  );

alter table public.game_rounds
  add constraint game_rounds_resolution_state_check
  check (
    (status = 'active' and result is null and accused_user_id is null and finished_at is null)
    or (status = 'finished' and result is not null and finished_at is not null)
  );

alter table public.game_rounds
  add constraint game_rounds_accusation_result_check
  check (
    (result in ('police_caught_thief', 'police_wrong_accusation') and accused_user_id is not null)
    or (result = 'thief_escaped_timeout' and accused_user_id is null)
    or result is null
  );

create index game_rounds_accused_user_id_idx on public.game_rounds(accused_user_id);

create or replace function public.accuse_player(p_code text, p_target_username text)
returns table (target_username text)
language plpgsql security definer volatile set search_path = public, pg_catalog
as $$
declare
  caller_id uuid := auth.uid();
  target_room public.rooms%rowtype;
  target_round public.game_rounds%rowtype;
  caller_role text;
  target_id uuid;
  target_name text;
  target_role_value text;
  resolution_result text;
  resolution_finished_at timestamptz := clock_timestamp();
begin
  if caller_id is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select r.* into target_room from public.rooms as r where r.code = upper(trim(p_code)) for update;
  if not found then raise exception 'Room not found'; end if;
  if not exists (select 1 from public.room_players as rp where rp.room_id = target_room.id and rp.user_id = caller_id) then
    raise exception 'You are not in this room' using errcode = '42501';
  end if;
  if target_room.status <> 'playing' then raise exception 'Room is not playing'; end if;
  select gr.* into target_round from public.game_rounds as gr where gr.room_id = target_room.id and gr.status = 'active' order by gr.round_number desc limit 1 for update;
  if not found then raise exception 'Round is not available'; end if;
  if pg_catalog.clock_timestamp() >= target_round.ends_at then raise exception 'Round has expired'; end if;
  select rp.role into caller_role from public.room_players as rp where rp.room_id = target_room.id and rp.user_id = caller_id;
  if caller_role <> 'police' then raise exception 'Only Police can accuse'; end if;
  if exists (select 1 from public.game_accusations as ga where ga.round_id = target_round.id) then raise exception 'Accusation already used'; end if;
  select p.id, p.username into target_id, target_name from public.profiles as p join public.room_players as rp on rp.user_id = p.id and rp.room_id = target_room.id where lower(p.username) = lower(trim(p_target_username));
  if not found then raise exception 'Target player not found'; end if;
  if target_id = caller_id then raise exception 'Cannot accuse yourself'; end if;
  select rp.role into target_role_value from public.room_players as rp where rp.room_id = target_room.id and rp.user_id = target_id;
  if target_role_value is null or target_role_value not in ('police', 'thief', 'people') then raise exception 'Target role is not assigned'; end if;
  insert into public.game_accusations (round_id, police_user_id, target_user_id) values (target_round.id, caller_id, target_id);
  resolution_result := case when target_role_value = 'thief' then 'police_caught_thief' else 'police_wrong_accusation' end;
  update public.game_rounds set status = 'finished', result = resolution_result, accused_user_id = target_id, finished_at = resolution_finished_at where id = target_round.id and status = 'active';
  if not found then raise exception 'Round is no longer active'; end if;
  update public.rooms set status = 'finished' where id = target_room.id and status = 'playing';
  return query select target_name;
end;
$$;

revoke execute on function public.accuse_player(text, text) from public, anon;
grant execute on function public.accuse_player(text, text) to authenticated;

create or replace function public.resolve_expired_round(p_code text)
returns table (round_status text, round_result text, finished_at timestamptz)
language plpgsql security definer volatile set search_path = public, pg_catalog
as $$
declare
  caller_id uuid := auth.uid();
  target_room public.rooms%rowtype;
  target_round public.game_rounds%rowtype;
  resolution_finished_at timestamptz;
begin
  if caller_id is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select r.* into target_room from public.rooms as r where r.code = upper(trim(p_code)) for update;
  if not found then raise exception 'Room not found'; end if;
  if not exists (select 1 from public.room_players as rp where rp.room_id = target_room.id and rp.user_id = caller_id) then raise exception 'You are not in this room' using errcode = '42501'; end if;
  select gr.* into target_round from public.game_rounds as gr where gr.room_id = target_room.id order by gr.round_number desc limit 1 for update;
  if not found then raise exception 'Round is not available'; end if;
  if target_round.status = 'finished' then return query select target_round.status, target_round.result, target_round.finished_at; return; end if;
  if target_round.status <> 'active' then raise exception 'Round is not available'; end if;
  if pg_catalog.clock_timestamp() < target_round.ends_at then raise exception 'Round has not expired'; end if;
  if exists (select 1 from public.game_accusations as ga where ga.round_id = target_round.id) then raise exception 'Accusation already recorded'; end if;
  resolution_finished_at := clock_timestamp();
  update public.game_rounds set status = 'finished', result = 'thief_escaped_timeout', finished_at = resolution_finished_at where id = target_round.id and status = 'active';
  if not found then
    select gr.* into target_round from public.game_rounds as gr where gr.id = target_round.id for update;
    if target_round.status = 'finished' then return query select target_round.status, target_round.result, target_round.finished_at; return; end if;
    raise exception 'Round could not be resolved';
  end if;
  update public.rooms set status = 'finished' where id = target_room.id and status = 'playing';
  return query select 'finished'::text, 'thief_escaped_timeout'::text, resolution_finished_at;
end;
$$;

revoke execute on function public.resolve_expired_round(text) from public, anon;
grant execute on function public.resolve_expired_round(text) to authenticated;

create or replace function public.get_game_round_data(p_code text)
returns table (room_id uuid, room_code text, room_status text, host_id uuid, round_id uuid, round_number integer, round_status text, round_started_at timestamptz, round_ends_at timestamptz, round_expired boolean, user_id uuid, username text, joined_at timestamptz, is_host boolean)
language plpgsql security definer stable set search_path = public, pg_catalog
as $$
declare
  target_room public.rooms%rowtype;
  target_round public.game_rounds%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select r.* into target_room from public.rooms as r where r.code = upper(trim(p_code));
  if not found then raise exception 'Room not found'; end if;
  if not exists (select 1 from public.room_players as rp where rp.room_id = target_room.id and rp.user_id = auth.uid()) then raise exception 'You are not in this room' using errcode = '42501'; end if;
  if target_room.status = 'waiting' then raise exception 'Room is still waiting'; end if;
  if target_room.status not in ('playing', 'finished') then raise exception 'Room is no longer available'; end if;
  select gr.* into target_round from public.game_rounds as gr where gr.room_id = target_room.id order by gr.round_number desc limit 1;
  if not found then raise exception 'Game round is not available'; end if;
  return query select target_room.id, target_room.code, target_room.status, target_room.host_id, target_round.id, target_round.round_number, target_round.status, target_round.started_at, target_round.ends_at, clock_timestamp() >= target_round.ends_at, rp.user_id, coalesce(p.username, 'Player'), rp.joined_at, rp.user_id = target_room.host_id from public.room_players as rp left join public.profiles as p on p.id = rp.user_id where rp.room_id = target_room.id order by rp.joined_at;
end;
$$;

revoke execute on function public.get_game_round_data(text) from public, anon;
grant execute on function public.get_game_round_data(text) to authenticated;

create or replace function public.get_round_result(p_code text)
returns table (round_id uuid, round_number integer, result text, accused_username text, username text, role text)
language plpgsql security definer stable set search_path = public, pg_catalog
as $$
declare
  caller_id uuid := auth.uid();
  target_room public.rooms%rowtype;
  target_round public.game_rounds%rowtype;
begin
  if caller_id is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select r.* into target_room from public.rooms as r where r.code = upper(trim(p_code));
  if not found then raise exception 'Room not found'; end if;
  if not exists (select 1 from public.room_players as rp where rp.room_id = target_room.id and rp.user_id = caller_id) then raise exception 'You are not in this room' using errcode = '42501'; end if;
  select gr.* into target_round from public.game_rounds as gr where gr.room_id = target_room.id order by gr.round_number desc limit 1;
  if not found then raise exception 'Round is not available'; end if;
  if target_round.status <> 'finished' or target_round.result is null or target_round.finished_at is null then raise exception 'Round result is not available'; end if;
  return query select target_round.id, target_round.round_number, target_round.result, accused_profile.username, p.username, rp.role from public.room_players as rp join public.profiles as p on p.id = rp.user_id left join public.profiles as accused_profile on accused_profile.id = target_round.accused_user_id where rp.room_id = target_room.id order by rp.joined_at;
end;
$$;

revoke execute on function public.get_round_result(text) from public, anon;
grant execute on function public.get_round_result(text) to authenticated;