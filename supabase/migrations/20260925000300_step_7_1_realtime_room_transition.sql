-- Step 7.1: allow authenticated room members to receive only room status changes through Realtime.

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
