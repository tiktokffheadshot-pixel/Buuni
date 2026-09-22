"use client";

import { useEffect, useState } from "react";

export function RoleReveal({ label }: { label: string }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRevealed(true);
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const [title, icon] = label.split(" ");

  return (
    <div
      className="fixed inset-0 z-[60] flex min-h-dvh w-full items-center justify-center overflow-hidden bg-[var(--foreground)] px-5 py-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[var(--background)] sm:px-8"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={
          "flex w-full max-w-xl flex-col items-center justify-center text-center motion-reduce:hidden " +
          (revealed ? "hidden" : "animate-pulse")
        }
      >
        <p className="text-sm font-black uppercase tracking-[0.28em] text-[var(--background)]/70 sm:text-base">
          Your role is...
        </p>
        <div className="mt-6 h-1 w-20 bg-[var(--accent)] sm:mt-8" />
        <p className="mt-6 text-3xl font-black tracking-tight sm:text-5xl">
          Revealing your role...
        </p>
      </div>

      <div
        className={
          "absolute inset-0 flex min-h-dvh w-full items-center justify-center px-5 text-center sm:px-8 " +
          "hidden motion-reduce:flex motion-reduce:transition-none " +
          (revealed
            ? "opacity-100 transition-all duration-500 ease-out"
            : "scale-90 opacity-0 transition-none")
        }
      >
        <div className="flex w-full max-w-3xl flex-col items-center">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--background)]/60 sm:text-sm">
            Your Role
          </p>

          <div
            className={
              "mt-5 text-[clamp(5rem,28vw,11rem)] leading-none " +
              (revealed
                ? "scale-100 opacity-100 transition-all duration-700 ease-out"
                : "scale-75 opacity-0 transition-none")
            }
            aria-hidden="true"
          >
            {icon}
          </div>

          <h1
            className={
              "mt-5 max-w-full break-words text-[clamp(3rem,15vw,7rem)] font-black uppercase leading-[0.9] tracking-[-0.04em] " +
              (revealed
                ? "translate-y-0 opacity-100 transition-all delay-100 duration-500 ease-out"
                : "translate-y-4 opacity-0 transition-none")
            }
          >
            {title}
          </h1>

          <div
            className={
              "mt-7 h-1.5 w-24 bg-[var(--accent)] " +
              (revealed
                ? "scale-x-100 opacity-100 transition-all delay-200 duration-500 ease-out"
                : "scale-x-0 opacity-0 transition-none")
            }
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
