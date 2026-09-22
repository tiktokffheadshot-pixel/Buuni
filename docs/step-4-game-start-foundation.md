# Buuni Step 4 — Game Start Foundation

Step 4 connects the existing room lifecycle to the first actual game screen.

## Flow

Home → Games → Thief, Police & People → Create/Join Room → Waiting Room → 4 players → Everyone Ready → Start Game → Game Screen

No roles, voting, investigation, chat, timers, XP, coins, rewards, animations, sound, or results are implemented here.

## Database authority

The existing 'waiting → playing → finished' lifecycle remains the only room-status system.

'start_room(room_id)' remains the authoritative transition. It:

- locks the room row;
- requires status = 'waiting';
- requires exactly 4 players;
- requires every player to be ready;
- changes the room to 'playing' atomically.

A new 'start_room_for_host(room_id, host_id)' wrapper is restricted to 'service_role'. It locks the same room, verifies the supplied host is still the current host, then calls 'start_room(room_id)'. This closes the race where the host could leave and host ownership could change between an authorization check and the transition.

The wrapper is the only start RPC used by the Buuni server action. The browser never receives a secret key and never gets permission to call either start RPC.

Because both the host check and 'start_room()' run while the room row is locked, concurrent start requests, host-leave races, already-playing rooms, finished rooms, and invalid room states resolve atomically. Only one request can perform 'waiting → playing'.

## Game data

'get_room_game_data(code)' is a read-only RPC for the game screen.

- It requires authentication.
- It verifies room membership before checking status.
- It returns player data only to members.
- 'waiting' redirects to the waiting room.
- 'finished' shows a finished-game state.
- non-members receive no player/game rows.

Direct access to 'rooms' and 'room_players' remains revoked.

## Server-side secret

The Next.js Start Game Server Action uses a server-only Supabase secret key to invoke 'start_room_for_host'.

Add the secret to the deployment/server environment as:

SUPABASE_SECRET_KEY=sb_secret_...

Do not prefix it with 'NEXT_PUBLIC_', do not commit it, and do not put it in browser code. Supabase's secret key is the current replacement for the legacy 'service_role' key.

'.env.example' documents the variable name but contains no credential.

## Direct URLs

'/games/thief-police-people/room/[code]' is authenticated and membership-protected.

- waiting → redirect to '/room/[code]';
- playing → show the game-start foundation;
- finished → show the finished/unavailable state;
- non-member → no game/player data and 'notFound()'.

The old '/room/[code]' route also stops behaving like a waiting lobby after the room becomes 'playing': it redirects members to the game screen. Finished rooms remain unavailable.

## Scope

This step intentionally stops at the game-start boundary. Role assignment is the next step.
