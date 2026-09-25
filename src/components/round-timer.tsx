"use client";

import { useEffect, useState } from "react";

function formatRemaining(remainingMs: number) {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

export function RoundTimer({ endsAt }: { endsAt: string }) {
  const endMs = Date.parse(endsAt);
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, endMs - Date.now()),
  );

  useEffect(() => {
    const update = () => {
      setRemainingMs(Math.max(0, endMs - Date.now()));
    };

    update();
    const intervalId = window.setInterval(update, 250);

    return () => window.clearInterval(intervalId);
  }, [endMs]);

  const expired = remainingMs <= 0;

  return (
    <div
      className={
        "min-w-[9.5rem] border-2 border-[var(--foreground)] px-4 py-3 text-center shadow-[3px_3px_0_var(--foreground)] " +
        (expired
          ? "bg-red-50"
          : "bg-[var(--background)]")
      }
      aria-live="polite"
      aria-label={
        expired
          ? "Round time expired"
          : formatRemaining(remainingMs) + " remaining in the round"
      }
    >
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">
        Round time
      </p>
      <p
        className={
          "mt-1 font-mono text-5xl font-black leading-none tabular-nums tracking-tight sm:text-6xl " +
          (expired ? "text-red-700" : "")
        }
      >
        {formatRemaining(remainingMs)}
      </p>
      {expired ? (
        <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-red-700">
          Time&apos;s up
        </p>
      ) : null}
    </div>
  );
}
