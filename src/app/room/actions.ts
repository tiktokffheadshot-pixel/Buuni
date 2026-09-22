"use server";

import { redirect } from "next/navigation";

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
  if (lower.includes("no longer accepting")) return "That room is no longer accepting players.";
  if (lower.includes("not in this room")) return "You are not in this room.";
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
