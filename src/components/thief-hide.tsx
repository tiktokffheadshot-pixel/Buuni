"use client";

import { useState } from "react";

import { hideThief } from "@/app/games/thief-police-people/actions";

type Props = {
  code: string;
  used: boolean;
  hiddenUntil: string | null;
};

export function ThiefHide({ code, used: initialUsed, hiddenUntil: initialHiddenUntil }: Props) {
  const [used, setUsed] = useState(initialUsed);
  const [hiddenUntil, setHiddenUntil] = useState(initialHiddenUntil);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitHide() {
    if (used || pending) return;

    setPending(true);
    setError(null);

    const response = await hideThief(code);

    setPending(false);

    if (!response.ok) {
      setError(response.message);
      return;
    }

    setUsed(true);
    setHiddenUntil(response.hiddenUntil);
  }

  return (
    <div className="mt-4 border-2 border-red-500 bg-[var(--background)] p-4 shadow-[4px_4px_0_var(--foreground)]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">
        Thief action
      </p>
      <h2 className="mt-2 text-2xl font-black">HIDE</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Hide once this round. The server records the action privately; it does not reveal a target or answer to Police.
      </p>

      <button
        type="button"
        onClick={submitHide}
        disabled={used || pending}
        className="mt-4 min-h-14 w-full border-2 border-[var(--foreground)] bg-red-600 px-4 font-black text-white shadow-[4px_4px_0_var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        {pending ? "Hiding…" : used ? "Hide used" : "Hide"}
      </button>

      {used ? (
        <p className="mt-3 text-sm font-black" role="status">
          {hiddenUntil
            ? "You are hidden until " + new Date(hiddenUntil).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }) + "."
            : "Hide has been used this round."}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm font-bold text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
