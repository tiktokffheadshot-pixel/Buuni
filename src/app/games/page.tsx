import { GameCard } from "@/components/game-card";

export default function GamesPage() {
  return (
    <div className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="max-w-2xl">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
          Games
        </p>
        <h1 className="text-4xl font-black tracking-[-0.035em] sm:text-5xl">
          Pick a game.
        </h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted)]">
          Buuni is starting with one social game. More can live here later
          without changing the way your account works.
        </p>
      </div>

      <div className="mt-10 max-w-2xl">
        <GameCard />
      </div>
    </div>
  );
}
