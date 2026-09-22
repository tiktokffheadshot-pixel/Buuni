import Link from "next/link";

export function GameCard() {
  return (
    <Link
      href="/games/thief-police-people"
      className="block border-2 border-[var(--foreground)] bg-[var(--panel)] shadow-[5px_5px_0_var(--foreground)] transition-transform hover:-translate-y-0.5"
    >
      <div className="flex min-h-48 items-end justify-between border-b-2 border-[var(--foreground)] bg-[var(--green)] p-5 text-white">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-white/70">
            First game
          </p>
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center border border-white/30 bg-white/10 text-2xl">
              🕵️
            </span>
            <h2 className="max-w-[15rem] text-2xl font-black leading-tight">
              Thief, Police &amp; People
            </h2>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
          <span className="border border-[var(--line)] bg-[var(--background)] px-2 py-1">
            4 Players
          </span>
          <span className="border border-[var(--line)] bg-[var(--background)] px-2 py-1">
            1 Police · 1 Thief · 2 People
          </span>
        </div>

        <p className="max-w-xl leading-7 text-[var(--muted)]">
          A social game where 4 players play, talk, investigate, and discover
          who the thief is.
        </p>

        <span className="inline-flex min-h-10 items-center border-2 border-[var(--foreground)] bg-[var(--background)] px-3 text-xs font-extrabold uppercase tracking-[0.12em]">
          Play this game
        </span>
      </div>
    </Link>
  );
}
