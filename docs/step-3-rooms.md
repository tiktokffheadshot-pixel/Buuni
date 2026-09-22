# Buuni Step 3 — Room System Foundation

Step 3 adds the Supabase-backed multiplayer room foundation without implementing game mechanics or Realtime.

## Database

Apply these migrations in order:

- `20260922000200_create_rooms.sql`
- `20260922000300_lock_room_tables_behind_rpc.sql`
- `20260922000400_fix_join_room_ambiguous_columns.sql`
- `20260922000500_fix_room_waiting_data_ambiguous_columns.sql`

They create `rooms` and `room_players`, enable RLS, add indexes/foreign keys, and expose only narrowly scoped authenticated RPC functions for room creation, joining, leaving, readiness, and waiting-room reads.

Room membership and the four-player limit are enforced inside PostgreSQL. The join function locks the room row before counting seats, so concurrent joins cannot overfill a room through the normal RPC path.

No game-role columns exist yet.

## Root cause found during Step 3 validation

The connected Supabase project initially had only the profiles migration applied. The room RPC functions therefore did not exist in the project.

After the room migrations were applied, validation exposed a second real SQL bug: `join_room()` and `get_room_waiting_data()` both return columns named `room_id` / `user_id`. Their PL/pgSQL membership queries used those names without table qualification, making PostgreSQL report an ambiguous column reference.

The two follow-up migrations qualify the affected columns. This is a database bug fix, not a UI workaround.

## Room lifecycle

- Creating a room creates the host as player 1 and marks the host ready.
- Joining requires a six-character room code and a room in `waiting` status.
- A room cannot accept more than four players.
- Players can toggle their own ready state.
- A leaving host transfers host ownership to the earliest remaining player.
- If the last player leaves, the room is deleted.
- The game is not started in Step 3.

## Security

The room tables have RLS enabled and direct table grants are revoked. Room mutations are performed through security-definer database functions that validate `auth.uid()` and membership before changing data. Function execution is granted only to authenticated users. No service-role key is used.

The waiting-room read function returns only the room the caller belongs to and the participant usernames needed by that room UI.

## User flow

The room system is now entered through the game-specific flow:

**Home → Pick a Game → Thief, Police & People → Create Room / Join Room → Waiting Room**

The game entry route is:

`/games/thief-police-people`

Unauthenticated visitors are redirected to login before they can create or join a room or enter a playable waiting room.

The generic multiplayer room section has been removed from the home page. This keeps the architecture ready for future games to have their own entry routes and room controls.

## UI

The waiting room is at `/room/[code]` and loads real Supabase data. It shows the code, host, up to four player slots, ready state, refresh, and leave actions.

Realtime is intentionally not enabled yet. Refresh is the synchronization mechanism for this foundation.

## Validation

Run:

```bash
npm install
npm run lint
npm run typecheck
npm run build
npm run dev
```

Then manually test with two or more real authenticated browser sessions:

1. Home → Games → Thief, Police & People.
2. Create a room and verify a real six-character code.
3. Verify the creator is host/player 1 and starts ready.
4. Join from another authenticated account.
5. Verify both real usernames appear.
6. Fill the room with four real accounts and confirm a fifth join is rejected by PostgreSQL.
7. Toggle ready/not-ready and refresh.
8. Have the host leave and verify host transfer.
9. Have the final player leave and verify the room is gone.
10. Open another user's room code while signed out and verify login is required.
11. While signed in as a non-member, attempt to load another room's URL and verify its data is not returned.
12. Repeat the existing Step 2 login/logout/session/account checks.
