-- Step 7.1: authorize room members for the rooms Realtime subscription.
-- The publication is limited to public.rooms and the payload is column-limited
-- by the client subscription to id/status only.

create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.room_players as rp
    where rp.room_id = p_room_id
      and rp.user_id = auth.uid()
  );
$$;

revoke execute on function public.is_room_member(uuid) from public, anon;
grant execute on function public.is_room_member(uuid) to authenticated;

grant select on public.rooms to authenticated;

create policy "Room members can receive room status changes"
  on public.rooms
  for select
  to authenticated
  using ((select public.is_room_member(id)));

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end;
$$;
