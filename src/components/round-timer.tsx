"use client";

import { useEffect, useState } from "react";

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
    const intervalId = window.setInterval(update, 1000);

    return () => window.clearInterval(intervalId);
  }, [endMs]);

  if (remainingMs <= 0) {
    return (
      <div
        className="border-2 border-[var(--foreground)] bg-[var(--background)] px-4 py-3 text-center"
        aria-live="polite"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
          Round timer
        </p>
        <p className="mt-1 text-2xl font-black tracking-tight">Time&apos;s up</p>
      </div>
    );
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <div
      className="border-2 border-[var(--foreground)] bg-[var(--background)] px-4 py-3 text-center"
      aria-label={minutes + " minutes " + seconds + " seconds remaining"}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
        Round timer
      </p>
      <p className="mt-1 text-3xl font-black tabular-nums tracking-tight">
        {minutes}:{String(seconds).padStart(2, "0")}
      </p>
    </div>
  );
}
