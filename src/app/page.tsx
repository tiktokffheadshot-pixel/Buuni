import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { CreateRoomButton, JoinRoomForm } from "@/components/room-buttons";
import { FeatureList } from "@/components/feature-list";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ room_error?: string }>;
}) {
  const { room_error: roomError } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        <div>
          <p className="mb-5 inline-flex border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
            Somali-first social gaming
          </p>

          <h1 className="max-w-xl text-5xl font-black tracking-[-0.045em] sm:text-6xl">
            Play. Talk. Compete.
          </h1>

          <p className="mt-5 max-w-lg text-lg leading-8 text-[var(--muted)]">
            Buuni brings people together around simple, social games built for
            conversation and competition.
          </p>

          {user ? (
            <section className="mt-8 border-2 border-[var(--foreground)] bg-[var(--panel)] p-5 shadow-[5px_5px_0_var(--foreground)]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
                Multiplayer
              </p>
              <h2 className="mt-2 text-2xl font-black">Start a room</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Create a room for up to 4 players, or join a friend with their room code.
              </p>

              {roomError ? (
                <p className="mt-4 border-2 border-[var(--accent)] bg-[#fff4ef] px-3 py-3 text-sm font-semibold leading-6 text-[var(--accent-dark)]" role="alert">
                  {roomError === "invalid"
                    ? "Enter a valid 6-character room code."
                    : roomError}
                </p>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1.35fr] sm:items-center">
                <CreateRoomButton />
                <JoinRoomForm />
              </div>
            </section>
          ) : (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center border-2 border-[var(--foreground)] bg-[var(--accent)] px-6 font-extrabold text-white shadow-[4px_4px_0_var(--foreground)] transition-transform hover:-translate-y-0.5"
              >
                Log in to play
              </Link>
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center justify-center border-2 border-[var(--foreground)] bg-[var(--panel)] px-6 font-extrabold transition-transform hover:-translate-y-0.5"
              >
                Create account
              </Link>
            </div>
          )}
        </div>

        <div
          id="game"
          className="relative border-2 border-[var(--foreground)] bg-[var(--panel)] p-5 shadow-[6px_6px_0_var(--foreground)] sm:p-7"
        >
          <div className="absolute right-4 top-4 border border-[var(--line)] bg-[var(--background)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">
            First game
          </div>

          <div className="flex min-h-[20rem] flex-col justify-between">
            <div>
              <div className="mb-7 flex gap-2" aria-hidden="true">
                <span className="grid size-12 place-items-center border-2 border-[var(--foreground)] bg-[var(--green)] text-xl text-white">
                  👮
                </span>
                <span className="grid size-12 place-items-center border-2 border-[var(--foreground)] bg-[var(--accent)] text-xl text-white">
                  🥷
                </span>
                <span className="grid size-12 place-items-center border-2 border-[var(--foreground)] bg-[#e8dfc9] text-xl">
                  👥
                </span>
              </div>

              <p className="mb-2 text-sm font-bold text-[var(--accent-dark)]">
                1 Police · 1 Thief · 2 People
              </p>
              <h2 className="max-w-md text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                Thief, Police &amp; People
              </h2>
            </div>

            <p className="mt-8 max-w-md text-base leading-7 text-[var(--muted)]">
              A social game where 4 players play, talk, investigate, and
              discover who the thief is.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <FeatureList />
      </div>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="border-l-4 border-[var(--accent)] pl-5">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            Built for people
          </p>
          <p className="mt-2 max-w-2xl text-2xl font-black tracking-tight sm:text-3xl">
            Start with one good game. Build the world around it carefully.
          </p>
        </div>
      </section>
    </div>
  );
}
