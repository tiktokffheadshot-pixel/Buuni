export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center px-4 py-12 sm:px-6">
      <section className="w-full max-w-md border-2 border-[var(--foreground)] bg-[var(--panel)] p-6 shadow-[6px_6px_0_var(--foreground)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
          Buuni account
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Login</h1>
        <p className="mt-3 leading-7 text-[var(--muted)]">
          Account access is coming later. This page is only a route placeholder
          for the initial platform navigation.
        </p>
      </section>
    </div>
  );
}
