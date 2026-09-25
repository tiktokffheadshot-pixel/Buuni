"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { resolveExpiredRound } from "@/app/games/thief-police-people/actions";

function formatRemaining(remainingMs: number) {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

export function RoundTimer({
  endsAt,
  code,
}: {
  endsAt: string;
  code: string;
}) {
  const router = useRouter();
  const endMs = Date.parse(endsAt);
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, endMs - Date.now()),
  );
  const resolutionStartedRef = useRef(false);

  useEffect(() => {
    const update = () => {
      const nextRemainingMs = Math.max(0, endMs - Date.now());
      setRemainingMs(nextRemainingMs);

      if (nextRemainingMs <= 0 && !resolutionStartedRef.current) {
        resolutionStartedRef.current = true;

        void resolveExpiredRound(code).then((response) => {
          if (response.ok && response.status === "finished") {
            router.refresh();
          }
        });
      }
    };

    update();
    const intervalId = window.setInterval(update, 250);

    return () => window.clearInterval(intervalId);
  }, [code, endMs, router]);

  const expired = remainingMs <= 0;

  return (
    <div
      className={
        "min-w-[9.5rem] border-2 border-[var(--foreground)] px-4 py-3 text-center shadow-[3px_3px_0_var(--foreground)] " +
        (expired ? "bg-red-50" : "bg-[var(--background)]")
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
