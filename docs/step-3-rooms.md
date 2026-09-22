# Buuni Step 3 — Room System Foundation

Step 3 adds the Supabase-backed multiplayer room foundation without implementing game mechanics or Realtime.

## Database

Apply these migrations in order:

- `20260922000200_create_rooms.sql`
- `20260922000300_lock_room_tables_behind_rpc.sql`

They create `rooms` and `room_players`, enable RLS, add indexes/foreign keys, and expose only narrowly scoped authenticated RPC functions for room creation, joining, leaving, readiness, and waiting-room reads.

Room membership and the four-player limit are enforced inside PostgreSQL. The join function locks the room row before counting seats, so concurrent joins cannot overfill a room through the normal RPC path.

No game-role columns exist yet.

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

## UI

Authenticated users get Create Room and Join Room actions on the home page.

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

Then manually test two authenticated browser sessions: create a room, join with the code, verify both users appear, test the four-player cap, ready/refresh, leave, and attempt unauthorized room access/manipulation.
