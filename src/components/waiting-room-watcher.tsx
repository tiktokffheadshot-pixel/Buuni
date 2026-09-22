"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const POLL_INTERVAL_MS = 2000;

export function WaitingRoomWatcher({ code }: { code: string }) {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    const checkRoom = async () => {
      const { error } = await supabase.rpc("get_room_waiting_data", {
        p_code: code,
      });

      if (!active) return;

      const message = error?.message?.toLowerCase() ?? "";

      if (message.includes("room is already playing")) {
        active = false;
        router.replace("/games/thief-police-people/room/" + code);
      }
    };

    const intervalId = window.setInterval(checkRoom, POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [code, router]);

  return null;
}
