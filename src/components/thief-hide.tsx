"use client";

import { useEffect, useState } from "react";

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
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!hiddenUntil) return;
    const update = () => setNow(Date.now());
    update();
    const intervalId = window.setInterval(update, 1000);
    return () => window.clearInterval(intervalId);
  }, [hiddenUntil]);

  const remainingSeconds = hiddenUntil ? Math.max(0, Math.ceil((Date.parse(hiddenUntil) - now) / 1000)) : 0;

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
        <div className="mt-3 border-2 border-red-500 bg-red-50 px-3 py-3" role="status">
          {remainingSeconds > 0 ? (
            <><p className="text-xl font-black text-red-700">HIDDEN</p><p className="mt-1 text-sm font-bold">You are hidden from Police investigation for {remainingSeconds}s.</p></>
          ) : (
            <><p className="text-xl font-black text-[var(--muted)]">HIDE ENDED</p><p className="mt-1 text-sm font-bold text-[var(--muted)]">Hide has ended. It cannot be used again this round.</p></>
          )}
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm font-bold text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
