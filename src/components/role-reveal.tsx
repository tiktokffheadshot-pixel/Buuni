"use client";

const ROLE_REVEAL_STYLES = `
@keyframes buuni-role-suspense {
  0%, 72% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.02); }
}

@keyframes buuni-role-enter {
  0% { opacity: 0; transform: scale(0.82); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes buuni-role-icon {
  0% { opacity: 0; transform: scale(0.72); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes buuni-role-title {
  0% { opacity: 0; transform: translateY(1rem) scale(0.96); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .buuni-role-suspense {
    display: none;
  }

  .buuni-role-screen {
    opacity: 1 !important;
    transform: none !important;
    animation: none !important;
  }

  .buuni-role-icon,
  .buuni-role-title {
    opacity: 1 !important;
    transform: none !important;
    animation: none !important;
  }
}
`;

export function RoleReveal({ label }: { label: string }) {
  const [title, icon] = label.split(" ");

  return (
    <div
      className="fixed inset-0 z-[9999] h-[100dvh] min-h-[100dvh] w-[100vw] min-w-[100vw] overflow-hidden overscroll-none bg-[var(--foreground)] text-[var(--background)]"
      aria-live="polite"
      aria-atomic="true"
    >
      <style>{ROLE_REVEAL_STYLES}</style>

      <div
        className="buuni-role-suspense absolute inset-0 flex h-[100dvh] w-[100vw] items-center justify-center px-6 text-center"
        aria-hidden="true"
        style={{
          animation:
            "buuni-role-suspense 1.2s cubic-bezier(.22,1,.36,1) forwards",
        }}
      >
        <div className="flex flex-col items-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[var(--background)]/70 sm:text-base">
            Revealing your role...
          </p>
          <div className="mt-7 h-1 w-16 bg-[var(--accent)]" />
        </div>
      </div>

      <div
        className="buuni-role-screen absolute inset-0 flex h-[100dvh] w-[100vw] items-center justify-center px-5 py-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center opacity-0 sm:px-8"
        style={{
          animation:
            "buuni-role-enter 0.7s cubic-bezier(.16,1,.3,1) 1.15s forwards",
        }}
      >
        <div className="flex w-full max-w-4xl flex-col items-center justify-center">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-[var(--background)]/55 sm:text-sm">
            Your role is...
          </p>

          <div
            className="buuni-role-icon mt-7 text-[clamp(7rem,42vw,16rem)] leading-none"
            aria-hidden="true"
            style={{
              opacity: 0,
              animation:
                "buuni-role-icon 0.7s cubic-bezier(.16,1,.3,1) 1.22s forwards",
            }}
          >
            {icon}
          </div>

          <h1
            className="buuni-role-title mt-5 max-w-full break-words text-[clamp(3.5rem,18vw,9rem)] font-black uppercase leading-[0.86] tracking-[-0.05em]"
            style={{
              opacity: 0,
              animation:
                "buuni-role-title 0.65s cubic-bezier(.16,1,.3,1) 1.28s forwards",
            }}
          >
            {title}
          </h1>

          <div className="mt-8 h-1.5 w-24 bg-[var(--accent)] sm:mt-10" />
        </div>
      </div>
    </div>
  );
}
