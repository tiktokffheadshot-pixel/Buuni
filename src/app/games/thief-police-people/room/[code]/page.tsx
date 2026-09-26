import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { playAgain } from "@/app/room/actions";
import { RoleReveal, type GameRole } from "@/components/role-reveal";
import { PoliceInvestigation } from "@/components/police-investigation";
import { FormSubmitButton } from "@/components/form-submit-button";
import { RoundResultRealtime } from "@/components/round-result-realtime";
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

type RoundRewardRow = {
  round_id: string;
  round_number: number;
  reward_type:
    | "police_caught_thief"
    | "police_wrong_accusation"
    | "thief_escaped_timeout";
  coins: number;
  xp: number;
  created_at: string;
};

type RoundResultRow = {
  round_id: string;
  round_number: number;
  result:
    | "police_caught_thief"
    | "police_wrong_accusation"
    | "thief_escaped_timeout";
  accused_username: string | null;
  username: string;
  role: GameRole;
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
    label: "Police",
    image: "/images/roles/police.png",
    accentClass: "text-sky-700",
    borderClass: "border-sky-500",
  },
  thief: {
    label: "Thief",
    image: "/images/roles/thief.png",
    accentClass: "text-red-700",
    borderClass: "border-red-500",
  },
  people: {
    label: "People",
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

function resultCopy(result: RoundResultRow["result"], accusedUsername: string | null) {
  if (result === "police_caught_thief") {
    return {
      title: "POLICE CAUGHT THE THIEF",
      explanation: accusedUsername
        ? "@" + accusedUsername + " was the Thief."
        : "The Police caught the Thief.",
      accent: "border-sky-500",
      text: "text-sky-700",
    };
  }

  if (result === "police_wrong_accusation") {
    return {
      title: "POLICE MADE A WRONG ACCUSATION",
      explanation: accusedUsername
        ? "@" + accusedUsername + " was People."
        : "The accused player was People.",
      accent: "border-amber-500",
      text: "text-amber-700",
    };
  }

  return {
    title: "THE THIEF ESCAPED",
    explanation: "Police did not make an accusation before time ran out.",
    accent: "border-red-500",
    text: "text-red-700",
  };
}

function RoundResult({
  rows,
  reward,
  code,
  playAgainMessage,
}: {
  rows: RoundResultRow[];
  reward: RoundRewardRow;
  code: string;
  playAgainMessage: string | null;
}) {
  const first = rows[0];
  const copy = resultCopy(first.result, first.accused_username);

  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-5 sm:px-6 sm:py-8">
      <section className="overflow-hidden border-2 border-[var(--foreground)] bg-[var(--panel)] shadow-[6px_6px_0_var(--foreground)]">
        <header className="border-b-2 border-[var(--foreground)] px-4 py-6 text-center sm:px-6 sm:py-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--accent-dark)]">
            Buuni • Thief, Police &amp; People
          </p>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[var(--muted)]">
            Round {first.round_number}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">
            ROUND COMPLETE
          </h1>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <section
            className={
              "border-2 bg-[var(--background)] p-6 text-center shadow-[4px_4px_0_var(--foreground)] sm:p-8 " +
              copy.accent
            }
          >
            <p className={"text-2xl font-black tracking-tight sm:text-4xl " + copy.text}>
              {copy.title}
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-base font-bold leading-7 text-[var(--muted)] sm:text-lg">
              {copy.explanation}
            </p>
          </section>

          <section className="mt-8">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                  Public reveal
                </p>
                <h2 className="mt-1 text-2xl font-black sm:text-3xl">THE PLAYERS</h2>
              </div>
              <span className="text-xs font-bold text-[var(--muted)]">4 / 4 roles revealed</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {rows.map((row) => {
                const roleUi = ROLE_UI[row.role];

                return (
                  <article
                    key={row.username}
                    className={
                      "flex items-center gap-4 border-2 bg-[var(--background)] p-4 shadow-[3px_3px_0_var(--foreground)] " +
                      roleUi.borderClass
                    }
                  >
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
                      <p className="truncate text-lg font-black">@{row.username}</p>
                      <p className={"mt-1 text-base font-black " + roleUi.accentClass}>
                        {roleUi.label}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mt-8 border-2 border-[var(--foreground)] bg-[var(--background)] p-5 text-center shadow-[4px_4px_0_var(--foreground)] sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
              Your reward
            </p>
            <p className="mt-3 text-3xl font-black sm:text-4xl">
              +{reward.coins} COINS
            </p>
            <p className="mt-1 text-lg font-black text-[var(--accent-dark)]">
              +{reward.xp} XP
            </p>
          </section>

          <section className="mt-8 border-2 border-[var(--foreground)] bg-[var(--panel)] p-5 shadow-[4px_4px_0_var(--foreground)] sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
              Next game
            </p>
            <h2 className="mt-1 text-2xl font-black">PLAY AGAIN</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Everyone from this round must choose Play Again before the room returns to the waiting state.
            </p>
            {playAgainMessage ? (
              <p className="mt-4 border-2 border-[var(--line)] bg-[var(--background)] px-3 py-3 text-sm font-bold">
                {playAgainMessage}
              </p>
            ) : null}
            <form action={playAgain} className="mt-5">
              <input type="hidden" name="code" value={code} />
              <FormSubmitButton pendingLabel="Joining…" className="min-h-12 w-full border-2 border-[var(--foreground)] bg-[var(--accent)] px-5 font-black text-white shadow-[4px_4px_0_var(--foreground)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0">
                PLAY AGAIN
              </FormSubmitButton>
            </form>
          </section>

          <p className="mt-8 border-t-2 border-[var(--line)] pt-5 text-center text-sm font-bold text-[var(--muted)]">
            Previous round is permanently finished. Rewards are saved to the server.
          </p>
        </main>
      </section>
    </div>
  );
}

export default async function ThiefPolicePeopleRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ play_again?: string; play_again_error?: string }>;
}) {
  const { code: rawCode } = await params;
  const { play_again: playAgainState, play_again_error: playAgainError } = await searchParams;
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

    if (message.includes("not in this room")) {
      notFound();
    }

    if (message.includes("game round is not available")) {
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

  if (first.round_status === "finished") {
    const { data: resultData, error: resultError } = await supabase.rpc(
      "get_round_result",
      { p_code: code },
    );

    if (resultError) {
      if (resultError.message?.toLowerCase().includes("not in this room")) {
        notFound();
      }

      if (resultError.message?.toLowerCase().includes("round result is not available")) {
        return (
          <GameUnavailable
            title="Result unavailable."
            message="The round is finished, but its public result is not available yet."
          />
        );
      }

      console.error("get_round_result failed:", resultError.message);
      return (
        <GameUnavailable
          title="Result unavailable."
          message="We could not load the authoritative round result. Please try again."
        />
      );
    }

    if (!resultData?.length || resultData.length !== 4) {
      return (
        <GameUnavailable
          title="Result unavailable."
          message="The public role reveal is incomplete."
        />
      );
    }

    const resultRows = resultData as RoundResultRow[];
    const currentPlayer = rows.find((row) => row.user_id === user.id);
    const yourRole = resultRows.find((row) => row.username === currentPlayer?.username)?.role;

    if (
      !currentPlayer ||
      (yourRole !== "police" && yourRole !== "thief" && yourRole !== "people")
    ) {
      return (
        <GameUnavailable
          title="Your role is unavailable."
          message="The completed round does not contain a valid role for the authenticated player."
        />
      );
    }

    const { data: rewardData, error: rewardError } = await supabase.rpc(
      "get_my_round_reward",
      { p_code: code },
    );

    if (rewardError) {
      console.error("get_my_round_reward failed:", rewardError.message);
      return (
        <GameUnavailable
          title="Reward unavailable."
          message="The round finished, but your reward could not be loaded safely."
        />
      );
    }

    if (!rewardData?.length || rewardData.length !== 1) {
      return (
        <GameUnavailable
          title="Reward unavailable."
          message="The server did not return exactly one reward for your completed round."
        />
      );
    }

    const playAgainMessage = playAgainError
      ? playAgainError
      : playAgainState === "waiting"
        ? "You are ready to play again. Waiting for the other 3 players."
        : null;

    return (
      <RoundResult
        rows={resultRows}
        reward={rewardData[0] as RoundRewardRow}
        code={code}
        playAgainMessage={playAgainMessage}
      />
    );
  }

  if (first.room_status !== "playing") {
    if (first.room_status === "waiting") redirect("/room/" + code);
    return <GameUnavailable title="Game unavailable." message="This room is not an active game." />;
  }

  const { data: roleData, error: roleError } = await supabase.rpc(
    "get_my_game_role",
    { p_code: code },
  );

  if (roleError) {
    const message = roleError.message?.toLowerCase() ?? "";

    if (message.includes("not in this room")) notFound();
    if (message.includes("room is still waiting")) redirect("/room/" + code);

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
  const timerEndsAt = first.round_ends_at;

  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-5 sm:px-6 sm:py-8">
      <RoundResultRealtime roomId={first.room_id} code={code} />

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
            <RoundTimer endsAt={timerEndsAt} code={code} />
          </div>
        </header>

        <div className="grid gap-0 lg:grid-cols-[1.45fr_0.75fr]">
          <main className="min-w-0 border-b-2 border-[var(--foreground)] p-4 sm:p-6 lg:border-b-0 lg:border-r-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                  Game status
                </p>
                <p className="mt-1 text-lg font-black">The round is active.</p>
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
                    {roleUi.label.startsWith("You") ? roleUi.label : "You are " + roleUi.label}
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
