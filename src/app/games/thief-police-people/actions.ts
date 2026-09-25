"use server";

import { createClient } from "@/lib/supabase/server";

type InvestigationResult =
  | {
      ok: true;
      targetUsername: string;
      targetRole: "police" | "thief" | "people";
    }
  | {
      ok: false;
      message: string;
    };

type AccusationResult =
  | {
      ok: true;
      targetUsername: string;
    }
  | {
      ok: false;
      message: string;
    };

function investigationError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("not authenticated")) return "Please sign in again.";
  if (lower.includes("room not found")) return "Room not found.";
  if (lower.includes("not in this room")) return "You are not a member of this room.";
  if (lower.includes("room is not playing")) return "The game is not currently active.";
  if (lower.includes("round is not available")) return "The active round is not available.";
  if (lower.includes("round has expired")) return "The round has expired.";
  if (lower.includes("only police")) return "Only the Police player can investigate.";
  if (lower.includes("cannot investigate yourself")) return "You cannot investigate yourself.";
  if (lower.includes("target player not found")) return "That player is not in this room.";
  if (lower.includes("investigation already used")) {
    return "You have already used your investigation.";
  }

  return "Investigation could not be completed.";
}

function accusationError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("not authenticated")) return "Please sign in again.";
  if (lower.includes("room not found")) return "Room not found.";
  if (lower.includes("not in this room")) return "You are not a member of this room.";
  if (lower.includes("room is not playing")) return "The game is not currently active.";
  if (lower.includes("round is not available")) return "The active round is not available.";
  if (lower.includes("round has expired")) return "The round has expired.";
  if (lower.includes("only police")) return "Only the Police player can accuse.";
  if (lower.includes("cannot accuse yourself")) return "You cannot accuse yourself.";
  if (lower.includes("target player not found")) return "That player is not in this room.";
  if (lower.includes("target role is not assigned")) return "That player's role is not available yet.";
  if (lower.includes("accusation already used")) {
    return "You have already made your accusation.";
  }

  return "Accusation could not be completed.";
}

export async function investigatePlayer(
  code: string,
  targetUsername: string,
): Promise<InvestigationResult> {
  const normalizedCode = code.trim().toUpperCase();
  const normalizedUsername = targetUsername.trim();

  if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
    return { ok: false, message: "Invalid room code." };
  }

  if (!normalizedUsername || normalizedUsername.length > 20) {
    return { ok: false, message: "Invalid target player." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Please sign in again." };
  }

  const { data, error } = await supabase.rpc("investigate_player", {
    p_code: normalizedCode,
    p_target_username: normalizedUsername,
  });

  if (error) {
    console.error("investigate_player failed:", error.message);
    return {
      ok: false,
      message: investigationError(error.message ?? ""),
    };
  }

  const row = data?.[0] as
    | { target_username?: string; target_role?: string }
    | undefined;

  if (
    !row ||
    typeof row.target_username !== "string" ||
    (row.target_role !== "police" &&
      row.target_role !== "thief" &&
      row.target_role !== "people")
  ) {
    console.error("investigate_player returned invalid result.");
    return { ok: false, message: "Investigation returned invalid data." };
  }

  return {
    ok: true,
    targetUsername: row.target_username,
    targetRole: row.target_role,
  };
}

export async function accusePlayer(
  code: string,
  targetUsername: string,
): Promise<AccusationResult> {
  const normalizedCode = code.trim().toUpperCase();
  const normalizedUsername = targetUsername.trim();

  if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
    return { ok: false, message: "Invalid room code." };
  }

  if (!normalizedUsername || normalizedUsername.length > 20) {
    return { ok: false, message: "Invalid target player." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Please sign in again." };
  }

  const { data, error } = await supabase.rpc("accuse_player", {
    p_code: normalizedCode,
    p_target_username: normalizedUsername,
  });

  if (error) {
    console.error("accuse_player failed:", error.message);
    return {
      ok: false,
      message: accusationError(error.message ?? ""),
    };
  }

  const row = data?.[0] as
    | { target_username?: string }
    | undefined;

  if (!row || typeof row.target_username !== "string") {
    console.error("accuse_player returned invalid result.");
    return { ok: false, message: "Accusation returned invalid data." };
  }

  return {
    ok: true,
    targetUsername: row.target_username,
  };
}
