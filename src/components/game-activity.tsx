"use client";

type GameEventType =
  | "thief_hide"
  | "police_investigation"
  | "police_accusation"
  | "round_finished";

type ActivityEvent = {
  event_type: GameEventType;
  created_at: string;
};

const EVENT_LABEL: Record<GameEventType, string> = {
  thief_hide: "🥷 A player used Hide",
  police_investigation: "👮 Police investigated a player",
  police_accusation: "⚠️ Police made an accusation",
  round_finished: "🏁 Round finished",
};

export function GameActivity({ events }: { events: ActivityEvent[] }) {
  return (
    <section className="mt-4 border-2 border-[var(--line)] bg-[var(--background)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-[0.16em]">Game activity</h2>
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">This round</span>
      </div>
      {events.length ? (
        <ul className="mt-3 grid gap-2">
          {events.map((event, index) => (
            <li key={event.created_at + "-" + index} className="border-b border-[var(--line)] pb-2 text-sm font-bold last:border-b-0 last:pb-0">
              {EVENT_LABEL[event.event_type]}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm font-semibold text-[var(--muted)]">No public actions yet.</p>
      )}
    </section>
  );
}
