"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function RoundResultRealtime({
  roomId,
  code,
}: {
  roomId: string;
  code: string;
}) {
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    const navigateToWaiting = () => {
      if (!active || handledRef.current) return;
      handledRef.current = true;
      router.replace("/room/" + code);
    };

    const channel = supabase
      .channel("round-result-" + roomId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: "id=eq." + roomId,
          select: ["id", "status"],
        },
        (payload) => {
          if (!active || handledRef.current) return;

          if (payload.new?.status === "waiting") {
            navigateToWaiting();
          } else if (payload.new?.status === "playing") {
            handledRef.current = true;
            router.replace("/games/thief-police-people/room/" + code);
          }
        },
      )
      .subscribe((status, error) => {
        if (!active) return;

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("round-result Realtime subscription failed:", error);
        }
      });

    const checkCurrentRoomStatus = async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("status")
        .eq("id", roomId)
        .maybeSingle();

      if (!active || handledRef.current || error) return;

      if (data?.status === "waiting") {
        navigateToWaiting();
      } else if (data?.status === "playing") {
        handledRef.current = true;
        router.replace("/games/thief-police-people/room/" + code);
      }
    };

    void checkCurrentRoomStatus();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [code, roomId, router]);

  return null;
}
