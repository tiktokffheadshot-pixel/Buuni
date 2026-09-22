revoke all on table public.rooms from anon, authenticated;
revoke all on table public.room_players from anon, authenticated;

drop policy if exists "Participants can view their room" on public.rooms;
drop policy if exists "Participants can view room players" on public.room_players;
