"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function rpcError(action: string, error: { code?: string; message?: string }) {
  const code = error.code ?? "unknown";
  const message = error.message ?? "No error message returned.";
  return action + " RPC failed [" + code + "]: " + message;
}

function roomErrorMessage(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("room not found")) return "Room not found. Check the code and try again.";
  if (lower.includes("room is full")) return "That room is full.";
  if (lower.includes("expired or is no longer available") || lower.includes("no longer accepting")) return "Room expired or is no longer available.";
  if (lower.includes("room is already playing")) return "This room has already started.";
  if (lower.includes("room is finished")) return "This room has already finished.";
  if (lower.includes("not in this room")) return "You are not in this room.";
  if (lower.includes("only the host can start")) return "Only the host can start the game.";
  if (lower.includes("must have exactly 4 players")) return "Exactly 4 players are required to start.";
  if (lower.includes("all players must be ready")) return "All 4 players must be ready before starting.";
  return message;
}

const gameLobbyPath = "/games/thief-police-people";

export async function createRoom() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login?next=" + encodeURIComponent(gameLobbyPath));

  const { data, error } = await supabase.rpc("create_room");

  if (error) {
    const message = rpcError("create_room", error);
    console.error(message);
    redirect(gameLobbyPath + "?room_error=" + encodeURIComponent(message));
  }

  if (!data?.[0]?.room_code) {
    const message = "create_room RPC returned no room code.";
    console.error(message);
    redirect(gameLobbyPath + "?room_error=" + encodeURIComponent(message));
  }

  redirect("/room/" + data[0].room_code);
}

export async function joinRoom(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();

  if (!/^[A-Z0-9]{6}$/.test(code)) {
    redirect(gameLobbyPath + "?room_error=Enter%20a%20valid%206-character%20room%20code.");
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login?next=" + encodeURIComponent(gameLobbyPath));

  const { data, error } = await supabase.rpc("join_room", { p_code: code });

  if (error) {
    const message = rpcError("join_room", error);
    console.error(message);
    redirect(gameLobbyPath + "?room_error=" + encodeURIComponent(roomErrorMessage(message)));
  }

  if (!data?.[0]?.room_code) {
    const message = "join_room RPC returned no room code.";
    console.error(message);
    redirect(gameLobbyPath + "?room_error=" + encodeURIComponent(message));
  }

  redirect("/room/" + data[0].room_code);
}

export async function leaveRoom(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();

  if (!/^[A-Z0-9]{6}$/.test(code)) redirect(gameLobbyPath);

  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_room", { p_code: code });

  if (error) {
    const message = rpcError("leave_room", error);
    console.error(message);
    redirect(gameLobbyPath + "?room_error=" + encodeURIComponent(roomErrorMessage(message)));
  }

  redirect(gameLobbyPath);
}

export async function setReady(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const ready = String(formData.get("ready") ?? "") === "true";

  if (!/^[A-Z0-9]{6}$/.test(code)) redirect(gameLobbyPath);

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_room_ready", {
    p_code: code,
    p_ready: ready,
  });

  if (error) {
    const message = rpcError("set_room_ready", error);
    console.error(message);
    throw new Error(message);
  }

  redirect("/room/" + code);
}

export async function startRoom(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();

  if (!/^[A-Z0-9]{6}$/.test(code)) redirect(gameLobbyPath);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login?next=" + encodeURIComponent("/room/" + code));

  const { data: waitingData, error: waitingError } = await supabase.rpc(
    "get_room_waiting_data",
    { p_code: code },
  );

  if (waitingError) {
    const message = roomErrorMessage(waitingError.message ?? "Unable to load room.");
    if (message === "This room has already started.") {
      redirect("/games/thief-police-people/room/" + code);
    }
    console.error(rpcError("get_room_waiting_data", waitingError));
    redirect("/room/" + code);
  }

  if (!waitingData?.length) {
    redirect("/room/" + code);
  }

  const firstRow = waitingData[0] as {
    room_id: string;
    is_host: boolean;
  };

  if (!firstRow.is_host) {
    redirect("/room/" + code);
  }

  const admin = createAdminClient();
  const { error: startError } = await admin.rpc("start_room_for_host", {
    p_room_id: firstRow.room_id,
    p_host_id: userData.user.id,
  });

  if (startError) {
    const message = roomErrorMessage(startError.message ?? "Unable to start the room.");
    if (message === "This room has already started.") {
      redirect("/games/thief-police-people/room/" + code);
    }
    console.error(rpcError("start_room_for_host", startError));
    redirect("/room/" + code);
  }

  redirect("/games/thief-police-people/room/" + code);
}
