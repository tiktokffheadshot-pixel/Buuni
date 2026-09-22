import { createRoom, joinRoom } from "@/app/room/actions";

export function CreateRoomButton() {
  return (
    <form action={createRoom}>
      <button
        type="submit"
        className="min-h-12 w-full border-2 border-[var(--foreground)] bg-[var(--accent)] px-5 font-black text-white shadow-[4px_4px_0_var(--foreground)] transition-transform hover:-translate-y-0.5"
      >
        Create Room
      </button>
    </form>
  );
}

export function JoinRoomForm() {
  return (
    <form action={joinRoom} className="flex flex-col gap-3 sm:flex-row">
      <label className="sr-only" htmlFor="room-code">
        Room code
      </label>
      <input
        id="room-code"
        name="code"
        className="min-h-12 min-w-0 flex-1 border-2 border-[var(--foreground)] bg-[var(--background)] px-3 text-base font-bold uppercase tracking-[0.18em] outline-none focus:shadow-[3px_3px_0_var(--accent)]"
        placeholder="ABC123"
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        maxLength={6}
        pattern="[A-Za-z0-9]{6}"
        required
      />
      <button
        type="submit"
        className="min-h-12 border-2 border-[var(--foreground)] bg-[var(--panel)] px-5 font-black shadow-[4px_4px_0_var(--foreground)] transition-transform hover:-translate-y-0.5"
      >
        Join Room
      </button>
    </form>
  );
}
