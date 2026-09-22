create or replace function public.join_room(p_code text)
returns table (room_id uuid, room_code text)
language plpgsql security definer set search_path = public, pg_catalog as $$
declare target_room public.rooms%rowtype; player_count integer;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select r.* into target_room from public.rooms as r where r.code = upper(trim(p_code)) for update;
  if not found then raise exception 'Room not found'; end if;
  if target_room.status <> 'waiting' then raise exception 'Room expired or is no longer available'; end if;
  if exists (select 1 from public.room_players as rp where rp.room_id = target_room.id and rp.user_id = auth.uid()) then
    return query select target_room.id, target_room.code; return;
  end if;
  select count(*)::integer into player_count from public.room_players as rp where rp.room_id = target_room.id;
  if player_count >= 4 then raise exception 'Room is full'; end if;
  insert into public.room_players (room_id, user_id) values (target_room.id, auth.uid());
  return query select target_room.id, target_room.code;
end; $$;

create or replace function public.leave_room(p_code text)
returns void language plpgsql security definer set search_path = public, pg_catalog as $$
declare target_room public.rooms%rowtype; next_host uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select r.* into target_room from public.rooms as r where r.code = upper(trim(p_code)) for update;
  if not found then raise exception 'Room not found'; end if;
  if target_room.status <> 'waiting' then raise exception 'Room expired or is no longer available'; end if;
  if not exists (select 1 from public.room_players as rp where rp.room_id = target_room.id and rp.user_id = auth.uid()) then raise exception 'You are not in this room' using errcode = '42501'; end if;
  delete from public.room_players where room_id = target_room.id and user_id = auth.uid();
  if target_room.host_id = auth.uid() then
    select rp.user_id into next_host from public.room_players as rp where rp.room_id = target_room.id order by rp.joined_at limit 1;
    if next_host is null then delete from public.rooms where id = target_room.id;
    else update public.rooms set host_id = next_host where id = target_room.id; end if;
  end if;
end; $$;

create or replace function public.get_room_waiting_data(p_code text)
returns table (room_id uuid, room_code text, room_status text, host_id uuid, user_id uuid, username text, joined_at timestamptz, is_ready boolean, is_host boolean)
language plpgsql security definer stable set search_path = public, pg_catalog as $$
declare target_room public.rooms%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select r.* into target_room from public.rooms as r where r.code = upper(trim(p_code));
  if not found then raise exception 'Room not found'; end if;
  if target_room.status <> 'waiting' then raise exception 'Room expired or is no longer available'; end if;
  if not exists (select 1 from public.room_players as rp where rp.room_id = target_room.id and rp.user_id = auth.uid()) then raise exception 'You are not in this room' using errcode = '42501'; end if;
  return query select target_room.id, target_room.code, target_room.status, target_room.host_id, rp.user_id, coalesce(p.username, 'Player'), rp.joined_at, rp.is_ready, rp.user_id = target_room.host_id
  from public.room_players as rp left join public.profiles as p on p.id = rp.user_id where rp.room_id = target_room.id order by rp.joined_at;
end; $$;

create or replace function public.start_room(p_room_id uuid)
returns void language plpgsql security definer set search_path = public, pg_catalog as $$
declare target_room public.rooms%rowtype; player_count integer; not_ready_count integer;
begin
  select r.* into target_room from public.rooms as r where r.id = p_room_id for update;
  if not found then raise exception 'Room not found'; end if;
  if target_room.status <> 'waiting' then raise exception 'Room is not waiting'; end if;
  select count(*)::integer into player_count from public.room_players as rp where rp.room_id = target_room.id;
  if player_count <> 4 then raise exception 'Room must have exactly 4 players'; end if;
  select count(*)::integer into not_ready_count from public.room_players as rp where rp.room_id = target_room.id and not rp.is_ready;
  if not_ready_count <> 0 then raise exception 'All players must be ready'; end if;
  update public.rooms set status = 'playing' where id = target_room.id;
end; $$;

create or replace function public.finish_room(p_room_id uuid)
returns void language plpgsql security definer set search_path = public, pg_catalog as $$
declare target_room public.rooms%rowtype;
begin
  select r.* into target_room from public.rooms as r where r.id = p_room_id for update;
  if not found then raise exception 'Room not found'; end if;
  if target_room.status <> 'playing' then raise exception 'Room is not playing'; end if;
  update public.rooms set status = 'finished' where id = target_room.id;
end; $$;

revoke execute on function public.join_room(text) from public, anon; grant execute on function public.join_room(text) to authenticated;
revoke execute on function public.leave_room(text) from public, anon; grant execute on function public.leave_room(text) to authenticated;
revoke execute on function public.get_room_waiting_data(text) from public, anon; grant execute on function public.get_room_waiting_data(text) to authenticated;
revoke execute on function public.start_room(uuid) from public, anon, authenticated; grant execute on function public.start_room(uuid) to service_role;
revoke execute on function public.finish_room(uuid) from public, anon, authenticated; grant execute on function public.finish_room(uuid) to service_role;