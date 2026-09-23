import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { RoleReveal, type GameRole } from "@/components/role-reveal";
import { createClient } from "@/lib/supabase/server";

type GameRow = {
  room_id: string;
  room_code: string;
  room_status: "waiting" | "playing" | "finished";
  host_id: string;
  user_id: string;
  username: string;
  joined_at: string;
  is_ready: boolean;
  is_host: boolean;
};

type GameRole = "police" | "thief" | "people";

export const dynamic = "force-dynamic";

export default async function ThiefPolicePeopleRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  if (!/^[A-Z0-9]{6}$/.test(code)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/games/thief-police-people/room/" + code);
  }

  const { data, error } = await supabase.rpc("get_room_game_data", {
    p_code: code,
  });

  if (error) {
    const message = error.message?.toLowerCase() ?? "";

    if (message.includes("room is still waiting")) {
      redirect("/room/" + code);
    }

    if (message.includes("room is finished")) {
      return (
        <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
          <section className="border-2 border-[var(--foreground)] bg-[var(--panel)] p-6 shadow-[6px_6px_0_var(--foreground)] sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
              Game unavailable
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              This game has finished.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              The room is no longer an active game.
            </p>
            <Link
              href="/games/thief-police-people"
              className="mt-6 inline-flex min-h-12 items-center justify-center border-2 border-[var(--foreground)] bg-[var(--accent)] px-5 font-black text-white shadow-[4px_4px_0_var(--foreground)]"
            >
              Back to game lobby
            </Link>
          </section>
        </div>
      );
    }

    if (message.includes("not in this room")) {
      notFound();
    }

    notFound();
  }

  if (!data?.length) {
    notFound();
  }

  const rows = data as GameRow[];

  const { data: roleData, error: roleError } = await supabase.rpc(
    "get_my_game_role",
    { p_code: code },
  );

  if (roleError) {
    const message = roleError.message?.toLowerCase() ?? "";

    if (message.includes("room is still waiting")) {
      redirect("/room/" + code);
    }

    if (message.includes("room is finished")) {
      return (
        <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
          <section className="border-2 border-[var(--foreground)] bg-[var(--panel)] p-6 shadow-[6px_6px_0_var(--foreground)] sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
              Game unavailable
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              This game has finished.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              The room is no longer an active game.
            </p>
            <Link
              href="/games/thief-police-people"
              className="mt-6 inline-flex min-h-12 items-center justify-center border-2 border-[var(--foreground)] bg-[var(--accent)] px-5 font-black text-white shadow-[4px_4px_0_var(--foreground)]"
            >
              Back to game lobby
            </Link>
          </section>
        </div>
      );
    }

    if (message.includes("not in this room")) {
      notFound();
    }

    notFound();
  }

  const roleValue: unknown = roleData?.[0]?.role;

  if (
    roleValue !== "police" &&
    roleValue !== "thief" &&
    roleValue !== "people"
  ) {
    throw new Error("Invalid game role returned by get_my_game_role.");
  }

  const role: GameRole = roleValue;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="border-2 border-[var(--foreground)] bg-[var(--panel)] p-5 shadow-[6px_6px_0_var(--foreground)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
          Game started
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Thief, Police &amp; People
        </h1>
        <p className="mt-2 text-sm font-bold text-[var(--muted)]">
          Room {rows[0].room_code}
        </p>

        <div className="mt-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-black">Players</h2>
            <span className="text-sm font-bold text-[var(--muted)]">{rows.length}/4</span>
          </div>

          <div className="mt-3 grid gap-2">
            {rows.map((row) => (
              <div
                key={row.user_id}
                className="flex min-h-16 items-center justify-between border-2 border-[var(--line)] bg-[var(--background)] px-4"
              >
                <p className="truncate font-black">@{row.username}</p>
                {row.is_host ? (
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-dark)]">
                    Host
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <RoleReveal role={role} />
      </section>
    </div>
  );
}
