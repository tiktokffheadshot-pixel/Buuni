"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function RoundResultRealtime({ roomId }: { roomId: string }) {
  const router = useRouter();
  const refreshedRef = useRef(false);

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
          if (!active || refreshedRef.current) return;

          if (payload.new?.status === "finished") {
            refreshedRef.current = true;
            router.refresh();
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [roomId, router]);

  return null;
}
