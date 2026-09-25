"use client";

import { useEffect, useMemo, useState } from "react";

import {
  accusePlayer,
  investigatePlayer,
} from "@/app/games/thief-police-people/actions";

type GameRole = "police" | "thief" | "people";

type Props = {
  code: string;
  role: GameRole;
  usernames: string[];
  currentUsername: string;
  endsAt: string;
};

const ROLE_LABEL: Record<GameRole, string> = {
  police: "Police",
  thief: "Thief",
  people: "People",
};

function roleSentence(role: GameRole) {
  return ROLE_LABEL[role];
}

function useRoundExpired(endsAt: string) {
  const endMs = Date.parse(endsAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();

    const intervalId = window.setInterval(update, 250);
    return () => window.clearInterval(intervalId);
  }, [endMs]);

  return now >= endMs;
}

export function PoliceInvestigation({
  code,
  role,
  usernames,
  currentUsername,
  endsAt,
}: Props) {
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [used, setUsed] = useState(false);
  const [result, setResult] = useState<{
    targetUsername: string;
    targetRole: GameRole;
  } | null>(null);
  const [accusationTarget, setAccusationTarget] = useState<string | null>(null);
  const [accusationPending, setAccusationPending] = useState(false);
  const [accusationLocked, setAccusationLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accusationErrorMessage, setAccusationErrorMessage] = useState<string | null>(null);
  const expired = useRoundExpired(endsAt);

  const targets = useMemo(
    () => usernames.filter((username) => username !== currentUsername),
    [usernames, currentUsername],
  );

  if (role !== "police") {
    return (
      <div className="mt-4 border-2 border-[var(--line)] bg-[var(--background)] p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
          {role === "thief" ? "Thief status" : "People status"}
        </p>
        <p className="mt-2 text-base font-black">
          {expired
            ? "The round has ended."
            : "The Police is investigating the room…"}
        </p>
      </div>
    );
  }

  async function submitInvestigation() {
    if (!selectedUsername || pending || used || expired) return;

    setPending(true);
    setError(null);

    const response = await investigatePlayer(code, selectedUsername);

    setPending(false);

    if (!response.ok) {
      setError(response.message);
      return;
    }

    setUsed(true);
    setResult({
      targetUsername: response.targetUsername,
      targetRole: response.targetRole,
    });
  }

  async function submitAccusation() {
    if (!accusationTarget || accusationPending || accusationLocked || expired) return;

    setAccusationPending(true);
    setAccusationErrorMessage(null);

    const response = await accusePlayer(code, accusationTarget);

    setAccusationPending(false);

    if (!response.ok) {
      setAccusationErrorMessage(response.message);
      return;
    }

    setAccusationLocked(true);
    setAccusationTarget(response.targetUsername);
  }

  if (accusationLocked && accusationTarget) {
    return (
      <div className="mt-4 border-2 border-amber-500 bg-[var(--background)] p-4 shadow-[4px_4px_0_var(--foreground)]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
          Accusation locked
        </p>
        <p className="mt-3 text-2xl font-black">@{accusationTarget}</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          You accused this player of being the Thief.
        </p>
        <p className="mt-3 text-sm font-black">Waiting for the round result…</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="mt-4 space-y-4">
        <div className="border-2 border-red-500 bg-[var(--background)] p-4 shadow-[4px_4px_0_var(--foreground)]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">
            Investigation complete
          </p>

          <div className="mt-3 border-2 border-[var(--line)] bg-[var(--panel)] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
              Investigated player
            </p>
            <p className="mt-2 text-2xl font-black">@{result.targetUsername}</p>
            <p className="mt-1 text-lg font-black">{roleSentence(result.targetRole)}</p>
          </div>

          <p className="mt-3 text-sm font-black">Investigation used.</p>
        </div>

        <div className="border-2 border-[var(--foreground)] bg-[var(--background)] p-4 shadow-[4px_4px_0_var(--foreground)]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
            Next action
          </p>
          <h2 className="mt-2 text-2xl font-black">Accuse the Thief</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Choose one player. Your accusation will be locked and the result will not be revealed yet.
          </p>

          <div className="mt-4 grid gap-2">
            {targets.map((username) => {
              const selected = accusationTarget === username;

              return (
                <button
                  key={username}
                  type="button"
                  onClick={() => setAccusationTarget(username)}
                  disabled={accusationPending || expired}
                  className={
                    "flex min-h-14 w-full items-center justify-between border-2 px-4 text-left font-black transition-colors disabled:cursor-not-allowed disabled:opacity-60 " +
                    (selected
                      ? "border-amber-600 bg-amber-100 text-amber-950"
                      : "border-[var(--line)] bg-[var(--panel)] hover:bg-[var(--background)]")
                  }
                  aria-pressed={selected}
                >
                  <span className="truncate">@{username}</span>
                  <span className="ml-3 shrink-0 text-xs uppercase tracking-wide">
                    {selected ? "Selected" : "Choose"}
                  </span>
                </button>
              );
            })}
          </div>

          {accusationTarget && !accusationPending ? (
            <div className="mt-4 border-2 border-amber-600 bg-amber-50 p-4">
              <p className="text-sm font-black">
                Accuse @{accusationTarget} of being the Thief?
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccusationTarget(null)}
                  className="min-h-12 border-2 border-[var(--foreground)] bg-[var(--background)] px-3 font-black"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitAccusation}
                  disabled={expired}
                  className="min-h-12 border-2 border-[var(--foreground)] bg-amber-500 px-3 font-black shadow-[3px_3px_0_var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Confirm accusation
                </button>
              </div>
            </div>
          ) : null}

          {accusationPending ? (
            <p className="mt-3 text-sm font-black" role="status">
              Locking accusation…
            </p>
          ) : null}

          {accusationErrorMessage ? (
            <p className="mt-3 text-sm font-bold text-red-700" role="alert">
              {accusationErrorMessage}
            </p>
          ) : null}

          {expired ? (
            <p className="mt-3 text-sm font-black text-red-700">
              The round has expired. Accusation is unavailable.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 border-2 border-sky-500 bg-[var(--background)] p-4 shadow-[4px_4px_0_var(--foreground)]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">
        Police investigation
      </p>

      {expired ? (
        <p className="mt-3 text-base font-black">The round has expired.</p>
      ) : used ? (
        <p className="mt-3 text-base font-black">
          Investigation used. Waiting for the next action…
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Choose one player to investigate. Their role will be revealed only to you.
          </p>

          <div className="mt-4 grid gap-2">
            {targets.map((username) => {
              const selected = selectedUsername === username;

              return (
                <button
                  key={username}
                  type="button"
                  onClick={() => setSelectedUsername(username)}
                  disabled={pending || expired}
                  className={
                    "flex min-h-14 w-full items-center justify-between border-2 px-4 text-left font-black transition-colors disabled:cursor-not-allowed disabled:opacity-60 " +
                    (selected
                      ? "border-sky-600 bg-sky-100 text-sky-900"
                      : "border-[var(--line)] bg-[var(--panel)] hover:bg-[var(--background)]")
                  }
                  aria-pressed={selected}
                >
                  <span className="truncate">@{username}</span>
                  <span className="ml-3 shrink-0 text-xs uppercase tracking-wide">
                    {selected ? "Selected" : "Choose"}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={submitInvestigation}
            disabled={!selectedUsername || pending || expired}
            className="mt-4 min-h-14 w-full border-2 border-[var(--foreground)] bg-sky-600 px-4 font-black text-white shadow-[4px_4px_0_var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Investigating…" : "Investigate"}
          </button>

          {error ? (
            <p className="mt-3 text-sm font-bold text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
