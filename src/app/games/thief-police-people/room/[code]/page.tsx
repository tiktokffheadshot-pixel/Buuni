import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { RoleReveal, type GameRole } from "@/components/role-reveal";
import { PoliceInvestigation } from "@/components/police-investigation";
import { RoundTimer } from "@/components/round-timer";
import { createClient } from "@/lib/supabase/server";

type GameRoundRow = {
  room_id: string;
  room_code: string;
  room_status: "waiting" | "playing" | "finished";
  host_id: string;
  round_id: string;
  round_number: number;
  round_status: "active" | "finished";
  round_started_at: string;
  round_ends_at: string;
  round_expired: boolean;
  user_id: string;
  username: string;
  joined_at: string;
  is_host: boolean;
};

export const dynamic = "force-dynamic";

const ROLE_UI: Record<
  GameRole,
  {
    label: string;
    image: string;
    accentClass: string;
    borderClass: string;
  }
> = {
  police: {
    label: "You are Police",
    image: "/images/roles/police.png",
    accentClass: "text-sky-700",
    borderClass: "border-sky-500",
  },
  thief: {
    label: "You are Thief",
    image: "/images/roles/thief.png",
    accentClass: "text-red-700",
    borderClass: "border-red-500",
  },
  people: {
    label: "You are People",
    image: "/images/roles/people.png",
    accentClass: "text-amber-700",
    borderClass: "border-amber-500",
  },
};

function GameUnavailable({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <section className="border-2 border-[var(--foreground)] bg-[var(--panel)] p-6 shadow-[6px_6px_0_var(--foreground)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
          Game unavailable
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{message}</p>
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

  const { data, error } = await supabase.rpc("get_game_round_data", {
    p_code: code,
  });

  if (error) {
    const message = error.message?.toLowerCase() ?? "";

    if (message.includes("room is still waiting")) {
      redirect("/room/" + code);
    }

    if (message.includes("room is finished")) {
      return (
        <GameUnavailable
          title="This game has finished."
          message="The room is no longer an active game."
        />
      );
    }

    if (message.includes("not in this room")) {
      notFound();
    }

    if (message.includes("round is not available")) {
      return (
        <GameUnavailable
          title="Round unavailable."
          message="The game started, but its round state is not available."
        />
      );
    }

    console.error("get_game_round_data failed:", error.message);
    return (
      <GameUnavailable
        title="Game data unavailable."
        message="We could not load the authoritative game round. Please try again."
      />
    );
  }

  if (!data?.length) notFound();

  const rows = data as GameRoundRow[];
  const first = rows[0];

  if (first.room_status !== "playing") {
    if (first.room_status === "waiting") redirect("/room/" + code);
    return <GameUnavailable title="Game unavailable." message="This room is not an active game." />;
  }

  if (first.round_status === "finished") {
    return (
      <GameUnavailable
        title="Round finished."
        message="This round is no longer active."
      />
    );
  }

  const { data: roleData, error: roleError } = await supabase.rpc(
    "get_my_game_role",
    { p_code: code },
  );

  if (roleError) {
    const message = roleError.message?.toLowerCase() ?? "";

    if (message.includes("not in this room")) notFound();
    if (message.includes("room is still waiting")) redirect("/room/" + code);
    if (message.includes("room is finished")) {
      return (
        <GameUnavailable
          title="This game has finished."
          message="The room is no longer an active game."
        />
      );
    }

    if (message.includes("role is not assigned")) {
      return (
        <GameUnavailable
          title="Role unavailable."
          message="Your private role has not been assigned. The game cannot continue safely."
        />
      );
    }

    throw new Error("Unable to retrieve the authenticated player's role.");
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
  const roleUi = ROLE_UI[role];
  const playerCount = rows.length;
  const playerNames = rows.map((row) => row.username);
  const currentUsername = rows.find((row) => row.user_id === user.id)?.username ?? "";
  const roundExpired = first.round_expired;
  const timerEndsAt = first.round_ends_at;

  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-5 sm:px-6 sm:py-8">
      <section className="overflow-hidden border-2 border-[var(--foreground)] bg-[var(--panel)] shadow-[6px_6px_0_var(--foreground)]">
        <header className="border-b-2 border-[var(--foreground)] px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-dark)]">
                Buuni • Thief, Police &amp; People
              </p>
              <h1 className="mt-1 truncate text-2xl font-black tracking-tight sm:text-3xl">
                Round {first.round_number}
              </h1>
              <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                Room {first.room_code}
              </p>
            </div>
            <RoundTimer endsAt={timerEndsAt} />
          </div>
        </header>

        <div className="grid gap-0 lg:grid-cols-[1.45fr_0.75fr]">
          <main className="min-w-0 border-b-2 border-[var(--foreground)] p-4 sm:p-6 lg:border-b-0 lg:border-r-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                  Game status
                </p>
                <p className="mt-1 text-lg font-black">
                  {roundExpired ? "Time's up" : "The round is active."}
                </p>
              </div>
              <div className="border-2 border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm font-black">
                {playerCount} / 4 players
              </div>
            </div>

            <div
              className={
                "mt-6 border-2 bg-[var(--background)] p-4 shadow-[4px_4px_0_var(--foreground)] " +
                roleUi.borderClass
              }
            >
              <div className="flex items-center gap-4">
                <div className="relative size-20 shrink-0 overflow-hidden border-2 border-[var(--foreground)] bg-white">
                  <Image
                    src={roleUi.image}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className={"text-lg font-black " + roleUi.accentClass}>
                    {roleUi.label}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
                    Your role is private. Other players&apos; roles are hidden.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 min-h-56 border-2 border-dashed border-[var(--line)] bg-[var(--background)] p-5 sm:min-h-64 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                Game area
              </p>
              <div className="flex min-h-44 flex-col items-center justify-center text-center">
                <p className="text-xl font-black">The round is active.</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
                  Police investigation and accusation actions appear here during the active round.
                </p>
              </div>
            </div>

            <PoliceInvestigation
              code={code}
              role={role}
              usernames={playerNames}
              currentUsername={currentUsername}
              endsAt={timerEndsAt}
            />
          </main>

          <aside className="p-4 sm:p-6">
            <div>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black">Players</h2>
                <span className="text-xs font-bold text-[var(--muted)]">
                  {playerCount} / 4
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {playerNames.map((username) => (
                  <div
                    key={username}
                    className="flex min-h-12 items-center border-2 border-[var(--line)] bg-[var(--background)] px-3"
                  >
                    <span className="truncate text-sm font-black">@{username}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 border-2 border-[var(--line)] bg-[var(--background)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                Chat
              </p>
              <p className="mt-2 text-sm font-bold">Chat coming next.</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                No messages are loaded or sent in this step.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <RoleReveal role={role} />
    </div>
  );
}
