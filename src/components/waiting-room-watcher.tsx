"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getWaitingRoomState,
  setReady,
  startRoom,
  type WaitingRoomPlayerState,
} from "@/app/room/actions";

const POLL_INTERVAL_MS = 2500;

type WaitingRoomWatcherProps = {
  code: string;
  initialPlayers: WaitingRoomPlayerState[];
};

export function WaitingRoomWatcher({
  code,
  initialPlayers,
}: WaitingRoomWatcherProps) {
  const router = useRouter();
  const [players, setPlayers] = useState(initialPlayers);
  const [status, setStatus] = useState<"waiting" | "playing" | "finished">("waiting");

  useEffect(() => {
    let active = true;
    let requestInFlight = false;
    let timerId: number | undefined;

    const poll = async () => {
      if (!active || requestInFlight) return;

      requestInFlight = true;

      try {
        const state = await getWaitingRoomState(code);

        if (!active) return;

        if (state.status === "playing") {
          active = false;
          router.replace("/games/thief-police-people/room/" + code);
          return;
        }

        if (state.status === "finished") {
          active = false;
          setStatus("finished");
          return;
        }

        if (state.status === "waiting") {
          setPlayers(state.players);
        }
      } catch {
        // Keep the waiting room alive through a transient polling failure.
      } finally {
        requestInFlight = false;
      }

      if (active) {
        timerId = window.setTimeout(() => {
          void poll();
        }, POLL_INTERVAL_MS);
      }
    };

    void poll();

    return () => {
      active = false;
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
      }
    };
  }, [code, router]);

  if (status === "finished") {
    return (
      <div className="mt-8 border-l-4 border-[var(--accent)] bg-[var(--background)] px-4 py-4">
        <p className="font-black">Room is no longer available.</p>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
          This waiting lobby has finished. Create a new room to play again.
        </p>
      </div>
    );
  }

  const currentPlayer = players.find((player) => player.is_current_user);
  const allReady = players.length === 4 && players.every((player) => player.is_ready);
  const currentPlayerIsHost = currentPlayer?.is_host ?? false;

  return (
    <>
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
                key={player?.username ?? "empty-" + index}
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
          <input type="hidden" name="code" value={code} />
          <button
            type="submit"
            disabled={!allReady}
            className="min-h-12 w-full border-2 border-[var(--foreground)] bg-[var(--accent)] px-5 font-black text-white shadow-[4px_4px_0_var(--foreground)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
          >
            Start Game
          </button>
        </form>
      ) : null}

      <div className="mt-6">
        <form action={setReady}>
          <input type="hidden" name="code" value={code} />
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
      </div>
    </>
  );
}
