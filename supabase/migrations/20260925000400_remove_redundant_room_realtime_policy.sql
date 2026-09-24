-- Step 7.1 cleanup: remove the redundant Realtime membership policy/helper.
-- The rooms table already has the intended RPC-only authorization model.
-- This migration is retained because it was applied to the remote project before
-- the Step 7.1 Realtime policy was corrected.

drop policy if exists "Room members can receive room status changes" on public.rooms;
drop function if exists public.is_room_member(uuid);
