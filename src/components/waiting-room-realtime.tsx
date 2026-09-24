"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Props = {
  roomId: string;
  code: string;
};

export function WaitingRoomRealtime({ roomId, code }: Props) {
  const router = useRouter();
  const [error, setError] = useState(false);
  const navigatingRef = useRef(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    const channel = supabase
      .channel("room-status-" + roomId)
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
          if (!active || navigatingRef.current) return;

          const status = payload.new?.status;

          if (status === "playing") {
            navigatingRef.current = true;
            router.replace("/games/thief-police-people/room/" + code);
          }
        },
      )
      .subscribe((status) => {
        if (!active) return;

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setError(true);
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [code, roomId, router]);

  if (!error) return null;

  return (
    <div className="mx-auto mb-4 w-full max-w-3xl px-4 sm:px-6">
      <div className="border-2 border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm font-semibold text-[var(--muted)]">
        Live game transition is unavailable. Refresh to check whether the game has started.
      </div>
    </div>
  );
}
