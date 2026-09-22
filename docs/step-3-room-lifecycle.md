# Buuni Step 3 — Room Lifecycle Fix

This fix keeps Step 3 as a room/waiting-room foundation. No game mechanics, roles, chat, Realtime, XP, coins, or Start Game UI are included.

## Root cause

The room lifecycle was not actually advancing. A room is created with status = waiting, and Step 3 had no operation that changed it to playing or finished.

The affected room 9C91FE was confirmed in the connected Supabase database as status = waiting with 4 players. Because it was still waiting, join_room correctly considered it joinable whenever a seat was available. The code was not expired; PostgreSQL still considered it an active waiting room.

## Lifecycle

The database now explicitly supports: waiting → playing → finished.

- create_room() still creates waiting rooms.
- join_room() accepts players only when status is waiting.
- get_room_waiting_data() exposes waiting-room data only while status is waiting.
- leave_room() is a waiting-room operation only. Host transfer and final-player cleanup are preserved.
- start_room(room_id) is database-authoritative and requires exactly four players who are all ready before changing waiting → playing.
- finish_room(room_id) is database-authoritative and changes only playing → finished.

The transition RPCs are not callable by normal authenticated clients. Their EXECUTE privilege is restricted to the Supabase service_role, so a browser cannot mark a room started or finished.

No application path calls start_room() or finish_room() yet. This is intentional because the game does not exist yet.

## Unavailable rooms

A playing or finished room is not a waiting-room lobby.

If a user manually enters a code for a room whose status is not waiting, the waiting-data RPC returns only:

Room expired or is no longer available

It does not return that room's player rows.

The join RPC returns the same unavailable-room message and never inserts membership.

## Room-code reuse

The existing unique index on rooms.code is preserved.

Finished rooms are retained rather than immediately deleted. This prevents an old code from silently becoming a different active room while historical lifecycle state is still present. A future cleanup/retention policy can remove old finished rooms safely without making codes active again.

Waiting rooms are still deleted when their final player leaves, and host transfer remains unchanged when other players remain.

## Security

RLS remains enabled and direct table access remains revoked. Room mutations and waiting-room reads continue through scoped RPC functions.

The four-player check remains inside join_room() under a row lock.

No service-role credential is exposed to the browser.

## Future game integration

When actual game mechanics are implemented:
1. The trusted game-start path calls start_room(room_id).
2. PostgreSQL validates 4 players + all ready and atomically changes the room to playing.
3. Game state and role/game mechanics operate only after the room is playing.
4. The trusted game-finish path calls finish_room(room_id).
5. Once finished, the normal waiting-room join flow cannot use that code.