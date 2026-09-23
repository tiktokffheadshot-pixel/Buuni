"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

const ROLE_REVEAL_STYLES = `
@keyframes buuni-role-suspense {
  0% { opacity: 1; transform: scale(1); }
  72% { opacity: 1; transform: scale(1.01); }
  100% { opacity: 0; transform: scale(1.03); }
}

@keyframes buuni-role-atmosphere {
  0% { opacity: 0; transform: scale(0.96); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes buuni-role-artwork {
  0% { opacity: 0; transform: translateY(1.5rem) scale(0.72) rotate(-2deg); }
  65% { opacity: 1; transform: translateY(-0.25rem) scale(1.04) rotate(0.5deg); }
  100% { opacity: 1; transform: translateY(0) scale(1) rotate(0); }
}

@keyframes buuni-role-title {
  0% { opacity: 0; transform: translateY(1.25rem) scale(0.88); letter-spacing: 0.04em; }
  100% { opacity: 1; transform: translateY(0) scale(1); letter-spacing: -0.05em; }
}

@keyframes buuni-role-streak {
  0% { opacity: 0; transform: translateX(-35vw) rotate(-12deg); }
  25% { opacity: 0.65; }
  100% { opacity: 0; transform: translateX(55vw) rotate(-12deg); }
}

@keyframes buuni-role-particle {
  0% { opacity: 0; transform: translate3d(0, 1.5rem, 0) scale(0.7); }
  25% { opacity: 0.65; }
  100% { opacity: 0; transform: translate3d(var(--particle-x), -7rem, 0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .buuni-role-suspense {
    display: none;
  }

  .buuni-role-atmosphere,
  .buuni-role-artwork,
  .buuni-role-title {
    opacity: 1 !important;
    transform: none !important;
    animation: none !important;
  }

  .buuni-role-streak,
  .buuni-role-particle {
    display: none;
  }
}
`;

export type GameRole = "police" | "thief" | "people";

const ROLE_CONFIG: Record<
  GameRole,
  {
    title: string;
    image: string;
    accent: string;
    glow: string;
    background: string;
  }
> = {
  thief: {
    title: "THIEF",
    image: "/images/roles/thief.png",
    accent: "#ef4444",
    glow: "rgba(239, 68, 68, 0.42)",
    background: "#120608",
  },
  police: {
    title: "POLICE",
    image: "/images/roles/police.png",
    accent: "#60a5fa",
    glow: "rgba(96, 165, 250, 0.38)",
    background: "#06101c",
  },
  people: {
    title: "PEOPLE",
    image: "/images/roles/people.png",
    accent: "#f4c95d",
    glow: "rgba(244, 201, 93, 0.34)",
    background: "#17120a",
  },
};

const PARTICLES = Array.from({ length: 14 }, (_, index) => index);

export function RoleReveal({ role }: { role: GameRole }) {
  const config = ROLE_CONFIG[role];

  const theme = {
    "--role-accent": config.accent,
    "--role-glow": config.glow,
    "--role-background": config.background,
  } as CSSProperties;

  return (
    <div
      className="fixed inset-0 z-[9999] h-[100dvh] min-h-[100dvh] w-[100vw] min-w-[100vw] overflow-hidden overscroll-none text-white"
      aria-live="polite"
      aria-atomic="true"
      style={{
        ...theme,
        backgroundColor: "var(--role-background)",
      }}
    >
      <style>{ROLE_REVEAL_STYLES}</style>

      <div
        className="buuni-role-suspense absolute inset-0 flex h-[100dvh] w-[100vw] items-center justify-center bg-[var(--role-background)] px-6 text-center"
        aria-hidden="true"
        style={{
          animation:
            "buuni-role-suspense 1.2s cubic-bezier(.22,1,.36,1) forwards",
        }}
      >
        <div className="flex flex-col items-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-white/70 sm:text-base">
            Revealing your role...
          </p>
          <div className="mt-7 h-1 w-16 bg-[var(--role-accent)]" />
        </div>
      </div>

      <div
        className="buuni-role-atmosphere absolute inset-0 overflow-hidden"
        aria-hidden="true"
        style={{
          opacity: 0,
          animation:
            "buuni-role-atmosphere 1s cubic-bezier(.16,1,.3,1) 0.45s forwards",
          background:
            "radial-gradient(circle at 50% 42%, var(--role-glow), transparent 48%), radial-gradient(circle at 50% 115%, rgba(255,255,255,0.08), transparent 45%)",
        }}
      >
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div
          className="buuni-role-streak absolute left-[-25vw] top-[34%] h-px w-[70vw] bg-[var(--role-accent)] shadow-[0_0_22px_var(--role-accent)]"
          style={{ animation: "buuni-role-streak 1.25s ease-out 0.9s forwards" }}
        />
        <div
          className="buuni-role-streak absolute left-[-35vw] top-[58%] h-px w-[80vw] bg-white/70"
          style={{ animation: "buuni-role-streak 1.1s ease-out 1.05s forwards" }}
        />

        {PARTICLES.map((particle) => (
          <span
            key={particle}
            className="buuni-role-particle absolute bottom-[18%] left-1/2 h-1.5 w-1.5 rounded-full bg-[var(--role-accent)]"
            style={{
              "--particle-x": `${(particle - 6.5) * 2.8}rem`,
              left: `${18 + particle * 5}%`,
              animation: `buuni-role-particle 1.8s ease-out ${0.65 + particle * 0.06}s forwards`,
            } as CSSProperties}
          />
        ))}
      </div>

      <div
        className="absolute inset-0 flex h-[100dvh] w-[100vw] items-center justify-center px-4 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-center sm:px-8"
      >
        <div className="flex h-full w-full max-w-4xl flex-col items-center justify-center">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-white/55 sm:text-sm">
            Your role is...
          </p>

          <div
            className="buuni-role-artwork relative mt-3 h-[min(54vh,30rem)] w-[min(82vw,30rem)] sm:mt-5 sm:h-[min(58vh,32rem)] sm:w-[min(70vw,34rem)]"
            style={{
              opacity: 0,
              animation:
                "buuni-role-artwork 0.95s cubic-bezier(.16,1,.3,1) 1.02s forwards",
              filter: "drop-shadow(0 24px 42px var(--role-glow))",
            }}
          >
            <Image
              src={config.image}
              alt=""
              fill
              sizes="(max-width: 640px) 82vw, 540px"
              className="object-contain"
              priority
            />
          </div>

          <h1
            className="buuni-role-title mt-1 max-w-full break-words text-[clamp(3.6rem,18vw,8.5rem)] font-black uppercase leading-[0.86] tracking-[-0.05em] text-white"
            style={{
              opacity: 0,
              textShadow: "0 0 28px var(--role-glow)",
              animation:
                "buuni-role-title 0.72s cubic-bezier(.16,1,.3,1) 1.2s forwards",
            }}
          >
            {config.title}
          </h1>

          <div
            className="mt-5 h-1.5 w-24 sm:mt-7"
            style={{
              backgroundColor: "var(--role-accent)",
              boxShadow: "0 0 18px var(--role-glow)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
