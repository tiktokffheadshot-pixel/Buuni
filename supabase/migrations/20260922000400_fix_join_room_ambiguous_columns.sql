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

  select r.* into target_room
  from public.rooms as r
  where r.code = upper(trim(p_code))
  for update;

  if not found then
    raise exception 'Room not found';
  end if;

  if target_room.status <> 'waiting' then
    raise exception 'Room is no longer accepting players';
  end if;

  if exists (
    select 1
    from public.room_players as rp
    where rp.room_id = target_room.id
      and rp.user_id = auth.uid()
  ) then
    return query select target_room.id, target_room.code;
    return;
  end if;

  select count(*)::integer into player_count
  from public.room_players as rp
  where rp.room_id = target_room.id;

  if player_count >= 4 then
    raise exception 'Room is full';
  end if;

  insert into public.room_players (room_id, user_id)
  values (target_room.id, auth.uid());

  return query select target_room.id, target_room.code;
end;
$$;

revoke execute on function public.join_room(text) from public, anon;
grant execute on function public.join_room(text) to authenticated;
