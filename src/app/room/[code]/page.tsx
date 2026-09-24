import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { leaveRoom, type WaitingRoomPlayerState } from "@/app/room/actions";
import { WaitingRoomWatcher } from "@/components/waiting-room-watcher";
import { createClient } from "@/lib/supabase/server";

type RoomPlayer = {
  user_id: string;
  username: string;
  is_ready: boolean;
  is_host: boolean;
};

type RoomRow = {
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

export const dynamic = "force-dynamic";

export default async function RoomPage({
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

  if (!user) redirect("/login?next=/room/" + code);

  const { data, error } = await supabase.rpc("get_room_waiting_data", {
    p_code: code,
  });

  if (error) {
    const message = error.message?.toLowerCase() ?? "";

    if (message.includes("room is already playing")) {
      redirect("/games/thief-police-people/room/" + code);
    }

    if (message.includes("room is finished") || message.includes("no longer available")) {
      return (
        <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
          <section className="border-2 border-[var(--foreground)] bg-[var(--panel)] p-6 shadow-[6px_6px_0_var(--foreground)] sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
              Room unavailable
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Room expired or is no longer available.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              This room is no longer an active waiting lobby. You can return to
              the game lobby to create a new room or enter another code.
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

    notFound();
  }

  if (!data?.length) {
    notFound();
  }

  const rows = data as RoomRow[];
  const first = rows[0];
  const initialPlayers: WaitingRoomPlayerState[] = rows.map((row) => ({
    username: row.username,
    is_ready: row.is_ready,
    is_host: row.is_host,
    is_current_user: row.user_id === user.id,
  }));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <WaitingRoomWatcher code={first.room_code} />
      <section className="border-2 border-[var(--foreground)] bg-[var(--panel)] p-5 shadow-[6px_6px_0_var(--foreground)] sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
              Waiting room
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Room {first.room_code}</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Share this code with the other players.
            </p>
          </div>
          <div className="border-2 border-[var(--foreground)] bg-[var(--background)] px-4 py-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              Code
            </p>
            <p className="mt-1 text-xl font-black tracking-[0.2em]">{first.room_code}</p>
          </div>
        </div>

        <WaitingRoomWatcher
          code={first.room_code}
          initialPlayers={initialPlayers}
        />

        <form action={leaveRoom} className="mt-3">
          <input type="hidden" name="code" value={first.room_code} />
          <button
            type="submit"
            className="min-h-11 w-full border-2 border-[var(--line)] px-4 font-bold text-[var(--accent-dark)] transition-colors hover:border-[var(--accent)]"
          >
            Leave room
          </button>
        </form>
      </section>
    </div>
  );
}
