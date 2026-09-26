"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function RoundResultRealtime({ roomId, code }: { roomId: string; code: string }) {
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

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

          if (payload.new?.status === "finished") {
            handledRef.current = true;
            router.refresh();
          } else if (payload.new?.status === "waiting") {
            handledRef.current = true;
            router.replace("/room/" + code);
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [code, roomId, router]);

  return null;
}
