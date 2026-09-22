"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function roomErrorMessage(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("room not found")) return "Room not found. Check the code and try again.";
  if (lower.includes("room is full")) return "That room is full.";
  if (lower.includes("no longer accepting")) return "That room is no longer accepting players.";
  if (lower.includes("not in this room")) return "You are not in this room.";
  return "We could not complete that room action. Please try again.";
}

export async function createRoom() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  const { data, error } = await supabase.rpc("create_room");

  if (error || !data?.[0]?.room_code) {
    throw new Error(roomErrorMessage(error?.message ?? "Room creation failed"));
  }

  redirect("/room/" + data[0].room_code);
}

export async function joinRoom(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();

  if (!/^[A-Z0-9]{6}$/.test(code)) {
    redirect("/?room_error=invalid");
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login?next=/?room_code=" + code);

  const { data, error } = await supabase.rpc("join_room", { p_code: code });

  if (error || !data?.[0]?.room_code) {
    redirect("/?room_error=" + encodeURIComponent(roomErrorMessage(error?.message ?? "Join failed")));
  }

  redirect("/room/" + data[0].room_code);
}

export async function leaveRoom(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();

  if (!/^[A-Z0-9]{6}$/.test(code)) redirect("/");

  const supabase = await createClient();
  await supabase.rpc("leave_room", { p_code: code });

  redirect("/");
}

export async function setReady(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const ready = String(formData.get("ready") ?? "") === "true";

  if (!/^[A-Z0-9]{6}$/.test(code)) redirect("/");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_room_ready", {
    p_code: code,
    p_ready: ready,
  });

  if (error) throw new Error(roomErrorMessage(error.message));

  redirect("/room/" + code);
}
