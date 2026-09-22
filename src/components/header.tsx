import Link from "next/link";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Games", href: "/games" },
  { label: "Login", href: "/login" },
];

export function Header() {
  return (
    <header className="border-b border-[var(--line)] bg-[var(--background)]">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-5 px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-black tracking-tight"
          aria-label="Buuni home"
        >
          <span className="grid size-9 place-items-center border-2 border-[var(--foreground)] bg-[var(--accent)] text-sm text-white shadow-[3px_3px_0_var(--foreground)] transition-transform group-hover:-translate-y-0.5">
            B
          </span>
          <span className="text-xl">Buuni</span>
        </Link>

        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-1 text-sm font-semibold sm:gap-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-10 items-center px-2.5 text-[var(--muted)] transition-colors hover:text-[var(--foreground)] sm:px-3"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
