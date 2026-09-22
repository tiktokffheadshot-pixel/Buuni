"use client";

import { useEffect, useState } from "react";

export function RoleReveal({ label }: { label: string }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setRevealed(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRevealed(true);
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div
      className={
        "mt-7 border-l-4 border-[var(--accent)] bg-[var(--background)] px-4 py-4 " +
        (revealed ? "" : "animate-pulse")
      }
      aria-live="polite"
      aria-atomic="true"
    >
      {revealed ? (
        <>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
            Your Role
          </p>
          <p className="mt-1 text-xl font-black">{label}</p>
        </>
      ) : (
        <>
          <p className="font-black">Revealing your role…</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Get ready.
          </p>
        </>
      )}
    </div>
  );
}
