import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, created_at")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <section className="border-2 border-[var(--accent)] bg-[var(--panel)] p-6 shadow-[6px_6px_0_var(--foreground)] sm:p-8">
          <h1 className="text-2xl font-black">Account setup is still finishing</h1>
          <p className="mt-3 leading-7 text-[var(--muted)]">
            Your account is authenticated, but the profile could not be loaded yet. Please refresh and try again.
          </p>
        </section>
      </div>
    );
  }

  const createdAt = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(profile.created_at));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <section className="border-2 border-[var(--foreground)] bg-[var(--panel)] p-6 shadow-[6px_6px_0_var(--foreground)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
          Your Buuni account
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          {profile.display_name || profile.username}
        </h1>
        <dl className="mt-8 divide-y-2 divide-[var(--line)] border-y-2 border-[var(--line)]">
          <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr] sm:gap-4">
            <dt className="text-sm font-bold text-[var(--muted)]">Username</dt>
            <dd className="font-semibold">@{profile.username}</dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr] sm:gap-4">
            <dt className="text-sm font-bold text-[var(--muted)]">Email</dt>
            <dd className="break-all font-semibold">{user.email ?? "Not available"}</dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr] sm:gap-4">
            <dt className="text-sm font-bold text-[var(--muted)]">Joined</dt>
            <dd className="font-semibold">{createdAt}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
