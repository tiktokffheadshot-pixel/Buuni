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
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select r.* into target_room
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

  return query
  select target_room.id,
         target_room.code,
         target_room.status,
         target_room.host_id,
         rp.user_id,
         coalesce(p.username, 'Player'),
         rp.joined_at,
         rp.is_ready,
         rp.user_id = target_room.host_id
  from public.room_players as rp
  left join public.profiles as p on p.id = rp.user_id
  where rp.room_id = target_room.id
  order by rp.joined_at;
end;
$$;

revoke execute on function public.get_room_waiting_data(text) from public, anon;
grant execute on function public.get_room_waiting_data(text) to authenticated;
