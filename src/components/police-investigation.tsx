"use client";

import { useEffect, useMemo, useState } from "react";

import { investigatePlayer } from "@/app/games/thief-police-people/actions";

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
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const targets = useMemo(
    () => usernames.filter((username) => username !== currentUsername),
    [usernames, currentUsername],
  );

  const endsAtMs = Date.parse(endsAt);
  const expired = now >= endsAtMs;

  useEffect(() => {
    const remainingMs = Math.max(0, endsAtMs - Date.now());

    if (remainingMs === 0) return;

    const timeoutId = window.setTimeout(() => {
      setNow(Date.now());
    }, remainingMs);

    return () => window.clearTimeout(timeoutId);
  }, [endsAtMs]);

  if (role !== "police") {
    return (
      <div className="mt-4 border-2 border-[var(--line)] bg-[var(--background)] p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
          {role === "thief" ? "Thief status" : "People status"}
        </p>
        <p className="mt-2 text-base font-black">
          {role === "thief"
            ? "Waiting for the next game action…"
            : "Stay alert…"}
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

      if (response.message === "The round has expired.") {
        setNow(Date.now());
      }

      if (response.message === "You have already used your investigation.") {
        setUsed(true);
      }

      return;
    }

    setUsed(true);
    setResult({
      targetUsername: response.targetUsername,
      targetRole: response.targetRole,
    });
  }

  if (result) {
    return (
      <div className="mt-4 border-2 border-red-500 bg-[var(--background)] p-4 shadow-[4px_4px_0_var(--foreground)]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">
          Investigation complete
        </p>

        <div className="mt-3 border-2 border-[var(--line)] bg-[var(--panel)] p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
            Investigated player
          </p>
          <p className="mt-2 text-2xl font-black">@{result.targetUsername}</p>
          <p className="mt-1 text-lg font-black">
            {roleSentence(result.targetRole)}
          </p>
        </div>

        <p className="mt-3 text-sm font-black">Investigation used.</p>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
          Police is waiting for the next game action.
        </p>
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
          You have already used your investigation.
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
                  disabled={pending}
                  className={
                    "flex min-h-12 w-full items-center justify-between border-2 px-3 text-left font-black transition-colors disabled:cursor-not-allowed disabled:opacity-60 " +
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
            className="mt-4 min-h-12 w-full border-2 border-[var(--foreground)] bg-sky-600 px-4 font-black text-white shadow-[4px_4px_0_var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
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
