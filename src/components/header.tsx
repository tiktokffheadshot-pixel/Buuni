import Link from "next/link";

import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const navItems = user
    ? [
        { label: "Home", href: "/" },
        { label: "Games", href: "/games" },
        { label: "Account", href: "/account" },
      ]
    : [
        { label: "Home", href: "/" },
        { label: "Games", href: "/games" },
        { label: "Login", href: "/login" },
        { label: "Sign Up", href: "/signup" },
      ];

  return (
    <header className="border-b border-[var(--line)] bg-[var(--background)]">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 font-black tracking-tight"
          aria-label="Buuni home"
        >
          <span className="grid size-9 place-items-center border-2 border-[var(--foreground)] bg-[var(--accent)] text-sm text-white shadow-[3px_3px_0_var(--foreground)] transition-transform group-hover:-translate-y-0.5">
            B
          </span>
          <span className="text-xl">Buuni</span>
        </Link>

        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-0.5 text-sm font-semibold sm:gap-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-10 items-center px-2 text-[var(--muted)] transition-colors hover:text-[var(--foreground)] sm:px-3"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {user ? (
              <li>
                <form action={logout}>
                  <button
                    type="submit"
                    className="inline-flex min-h-10 items-center px-2 font-semibold text-[var(--accent-dark)] transition-colors hover:text-[var(--foreground)] sm:px-3"
                  >
                    Logout
                  </button>
                </form>
              </li>
            ) : null}
          </ul>
        </nav>
      </div>
    </header>
  );
}
