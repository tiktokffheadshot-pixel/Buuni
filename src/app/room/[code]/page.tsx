import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { leaveRoom, setReady, startRoom } from "@/app/room/actions";
import { WaitingRoomWatcher } from "@/components/waiting-room-watcher";
import { createClient } from "@/lib/supabase/server";

type RoomPlayer = {
  user_id: string;
  username: string;
  is_ready: boolean;
  is_host: boolean;
};

type RoomRow = {
  room_id: string;
  room_code: string;
  room_status: "waiting" | "playing" | "finished";
  host_id: string;
  user_id: string;
  username: string;
  joined_at: string;
  is_ready: boolean;
  is_host: boolean;
};

export const dynamic = "force-dynamic";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  if (!/^[A-Z0-9]{6}$/.test(code)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/room/" + code);

  const { data, error } = await supabase.rpc("get_room_waiting_data", {
    p_code: code,
  });

  if (error) {
    const message = error.message?.toLowerCase() ?? "";

    if (message.includes("room is already playing")) {
      redirect("/games/thief-police-people/room/" + code);
    }

    if (message.includes("room is finished") || message.includes("no longer available")) {
      return (
        <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
          <section className="border-2 border-[var(--foreground)] bg-[var(--panel)] p-6 shadow-[6px_6px_0_var(--foreground)] sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
              Room unavailable
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Room expired or is no longer available.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              This room is no longer an active waiting lobby. You can return to
              the game lobby to create a new room or enter another code.
            </p>
            <Link
              href="/games/thief-police-people"
              className="mt-6 inline-flex min-h-12 items-center justify-center border-2 border-[var(--foreground)] bg-[var(--accent)] px-5 font-black text-white shadow-[4px_4px_0_var(--foreground)]"
            >
              Back to game lobby
            </Link>
          </section>
        </div>
      );
    }

    notFound();
  }

  if (!data?.length) {
    notFound();
  }

  const rows = data as RoomRow[];
  const first = rows[0];
  const players: RoomPlayer[] = rows.map((row) => ({
    user_id: row.user_id,
    username: row.username,
    is_ready: row.is_ready,
    is_host: row.is_host,
  }));
  const currentPlayer = players.find((player) => player.user_id === user.id);
  const allReady = players.length === 4 && players.every((player) => player.is_ready);
  const currentPlayerIsHost = currentPlayer?.is_host ?? false;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <WaitingRoomWatcher code={first.room_code} />
      <section className="border-2 border-[var(--foreground)] bg-[var(--panel)] p-5 shadow-[6px_6px_0_var(--foreground)] sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
              Waiting room
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Room {first.room_code}</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Share this code with the other players.
            </p>
          </div>
          <div className="border-2 border-[var(--foreground)] bg-[var(--background)] px-4 py-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              Code
            </p>
            <p className="mt-1 text-xl font-black tracking-[0.2em]">{first.room_code}</p>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-black">Players</h2>
            <span className="text-sm font-bold text-[var(--muted)]">{players.length}/4</span>
          </div>

          <div className="mt-3 grid gap-2">
            {Array.from({ length: 4 }, (_, index) => {
              const player = players[index];

              return (
                <div
                  key={player?.user_id ?? "empty-" + index}
                  className="flex min-h-16 items-center justify-between gap-3 border-2 border-[var(--line)] bg-[var(--background)] px-4"
                >
                  {player ? (
                    <>
                      <div className="min-w-0">
                        <p className="truncate font-black">
                          @{player.username}
                          {player.is_host ? (
                            <span className="ml-2 text-xs font-bold uppercase tracking-wide text-[var(--accent-dark)]">
                              Host
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs font-semibold text-[var(--muted)]">
                          {player.is_ready ? "Ready" : "Not ready"}
                        </p>
                      </div>
                      <span
                        aria-label={player.is_ready ? "Ready" : "Not ready"}
                        className={
                          "size-3 shrink-0 border border-[var(--foreground)] " +
                          (player.is_ready ? "bg-[var(--green)]" : "bg-[var(--line)]")
                        }
                      />
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-[var(--muted)]">Waiting for a player…</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-7 border-l-4 border-[var(--accent)] bg-[var(--background)] px-4 py-4">
          <p className="font-black">
            {allReady
              ? "All 4 players are ready."
              : players.length === 4
                ? "All seats are filled. Everyone must be ready."
                : "Waiting for more players…"}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            {allReady
              ? currentPlayerIsHost
                ? "You can start the game when everyone is ready."
                : "The host can start the game when everyone is ready."
              : "Players and readiness update automatically while you wait."}
          </p>
        </div>

        {currentPlayerIsHost ? (
          <form action={startRoom} className="mt-6">
            <input type="hidden" name="code" value={first.room_code} />
            <button
              type="submit"
              disabled={!allReady}
              className="min-h-12 w-full border-2 border-[var(--foreground)] bg-[var(--accent)] px-5 font-black text-white shadow-[4px_4px_0_var(--foreground)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
            >
              Start Game
            </button>
          </form>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <form action={setReady} className="flex-1">
            <input type="hidden" name="code" value={first.room_code} />
            <input
              type="hidden"
              name="ready"
              value={currentPlayer?.is_ready ? "false" : "true"}
            />
            <button
              type="submit"
              className="min-h-12 w-full border-2 border-[var(--foreground)] bg-[var(--green)] px-5 font-black text-white shadow-[4px_4px_0_var(--foreground)] transition-transform hover:-translate-y-0.5"
            >
              {currentPlayer?.is_ready ? "Mark Not Ready" : "Ready Up"}
            </button>
          </form>
          <Link
            href={"/room/" + first.room_code}
            className="inline-flex min-h-12 items-center justify-center border-2 border-[var(--foreground)] bg-[var(--background)] px-5 font-black shadow-[4px_4px_0_var(--foreground)]"
          >
            Refresh
          </Link>
        </div>

        <form action={leaveRoom} className="mt-3">
          <input type="hidden" name="code" value={first.room_code} />
          <button
            type="submit"
            className="min-h-11 w-full border-2 border-[var(--line)] px-4 font-bold text-[var(--accent-dark)] transition-colors hover:border-[var(--accent)]"
          >
            Leave room
          </button>
        </form>
      </section>
    </div>
  );
}
