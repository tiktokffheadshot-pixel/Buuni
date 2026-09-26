"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Props = { roomId: string };
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000];
const REFRESH_DEBOUNCE_MS = 150;

export function RoomGameRealtime({ roomId }: Props) {
  const router = useRouter();
  const roomIdRef = useRef(roomId);

  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimer: number | null = null;
    let refreshTimer: number | null = null;
    let reconnectAttempt = 0;
    let refreshQueued = false;

    const requestRefresh = () => {
      if (!active || refreshQueued) return;
      refreshQueued = true;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        refreshQueued = false;
        if (active) router.refresh();
      }, REFRESH_DEBOUNCE_MS);
    };

    const scheduleReconnect = () => {
      if (!active || reconnectTimer !== null) return;
      const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)];
      reconnectAttempt += 1;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        if (!active) return;
        const oldChannel = channel;
        channel = null;
        if (oldChannel) {
          void supabase.removeChannel(oldChannel).finally(() => { if (active) connect(); });
        } else {
          connect();
        }
      }, delay);
    };

    const connect = () => {
      if (!active || channel) return;
      channel = supabase
        .channel("room-sync-" + roomIdRef.current)
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: "id=eq." + roomIdRef.current,
          select: ["id", "status", "updated_at"],
        }, requestRefresh)
        .subscribe((status, error) => {
          if (!active) return;
          if (status === "SUBSCRIBED") {
            reconnectAttempt = 0;
            requestRefresh();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("Room Realtime degraded; resynchronizing.", error);
            requestRefresh();
            scheduleReconnect();
          } else if (status === "CLOSED") {
            console.info("Room Realtime channel closed; resynchronizing.");
            requestRefresh();
            scheduleReconnect();
          }
        });
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        requestRefresh();
        if (!channel) connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    requestRefresh();
    connect();

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibility);
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      const oldChannel = channel;
      channel = null;
      if (oldChannel) void supabase.removeChannel(oldChannel);
    };
  }, [router]);

  return null;
}
