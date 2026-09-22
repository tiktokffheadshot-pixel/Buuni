import { redirect } from "next/navigation";

import { CreateRoomButton, JoinRoomForm } from "@/components/room-buttons";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ThiefPolicePeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ room_error?: string }>;
}) {
  const { room_error: roomError } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/games/thief-police-people");
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <section className="border-2 border-[var(--foreground)] bg-[var(--panel)] p-5 shadow-[6px_6px_0_var(--foreground)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
          Game lobby
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Thief, Police &amp; People
        </h1>

        <p className="mt-3 text-sm font-bold text-[var(--muted)]">
          1 Police · 1 Thief · 2 People
        </p>

        <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">
          A 4-player social game where players talk, investigate, and try to
          discover who the thief is.
        </p>

        {roomError ? (
          <p
            className="mt-6 border-2 border-[var(--accent)] bg-[#fff4ef] px-3 py-3 text-sm font-semibold leading-6 text-[var(--accent-dark)]"
            role="alert"
          >
            {roomError}
          </p>
        ) : null}

        <div className="mt-8 grid gap-6 border-t-2 border-[var(--line)] pt-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              Create
            </p>
            <h2 className="mt-1 text-xl font-black">Create a room</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              You will become the host and first player.
            </p>
            <div className="mt-4 max-w-sm">
              <CreateRoomButton />
            </div>
          </div>

          <div className="border-t-2 border-[var(--line)] pt-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              Join
            </p>
            <h2 className="mt-1 text-xl font-black">Join a room</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Enter the 6-character code shared by the host.
            </p>
            <div className="mt-4">
              <JoinRoomForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
