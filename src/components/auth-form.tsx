"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const usernamePattern = /^[A-Za-z0-9_]+$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function inputClassName() {
  return "mt-2 min-h-12 w-full border-2 border-[var(--foreground)] bg-[var(--background)] px-3 text-base outline-none transition-shadow placeholder:text-[var(--muted)] focus:shadow-[3px_3px_0_var(--accent)]";
}

function friendlyAuthError(message: string, mode: "login" | "signup") {
  const lower = message.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts right now. Please wait a little and try again.";
  }

  if (
    mode === "signup" &&
    (lower.includes("duplicate") ||
      lower.includes("unique") ||
      lower.includes("profiles_username"))
  ) {
    return "That username is already taken. Please choose another one.";
  }

  if (
    mode === "login" &&
    (lower.includes("invalid login credentials") ||
      lower.includes("invalid credentials"))
  ) {
    return "The email or password is incorrect.";
  }

  if (mode === "signup" && lower.includes("already registered")) {
    return "We could not create that account. Please check the details or use another email.";
  }

  return mode === "signup"
    ? "We could not create your account. Please check your details and try again."
    : "We could not log you in. Please check your details and try again.";
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!emailPattern.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Enter your password.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError) {
      setLoading(false);
      setError(friendlyAuthError(authError.message, "login"));
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
      <label className="block text-sm font-bold">
        Email
        <input
          className={inputClassName()}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </label>

      <label className="block text-sm font-bold">
        Password
        <input
          className={inputClassName()}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Your password"
          required
        />
      </label>

      {error ? (
        <p className="border-2 border-[var(--accent)] bg-[#fff4ef] px-3 py-3 text-sm font-semibold leading-6 text-[var(--accent-dark)]" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="min-h-12 w-full border-2 border-[var(--foreground)] bg-[var(--accent)] px-4 font-black text-white shadow-[4px_4px_0_var(--foreground)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Logging in..." : "Log in"}
      </button>

      <p className="text-center text-sm text-[var(--muted)]">
        New to Buuni?{" "}
        <Link className="font-bold text-[var(--foreground)] underline underline-offset-4" href="/signup">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedUsername.length < 3 || normalizedUsername.length > 20) {
      setError("Username must be 3–20 characters long.");
      return;
    }

    if (!usernamePattern.test(normalizedUsername)) {
      setError("Username can use only letters, numbers, and underscores.");
      return;
    }

    if (!emailPattern.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      setError("Password must be at least 8 characters and include a letter and a number.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          username: normalizedUsername,
        },
      },
    });

    if (authError) {
      setLoading(false);
      setError(friendlyAuthError(authError.message, "signup"));
      return;
    }

    if (!data.session) {
      setLoading(false);
      setNotice("Your account was created. Check your email to confirm it, then log in.");
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
      <label className="block text-sm font-bold">
        Username
        <input
          className={inputClassName()}
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="your_username"
          minLength={3}
          maxLength={20}
          required
        />
        <span className="mt-1.5 block text-xs font-normal text-[var(--muted)]">
          3–20 letters, numbers, or underscores.
        </span>
      </label>

      <label className="block text-sm font-bold">
        Email
        <input
          className={inputClassName()}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </label>

      <label className="block text-sm font-bold">
        Password
        <input
          className={inputClassName()}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          required
        />
        <span className="mt-1.5 block text-xs font-normal text-[var(--muted)]">
          Use at least 8 characters with a letter and a number.
        </span>
      </label>

      <label className="block text-sm font-bold">
        Confirm password
        <input
          className={inputClassName()}
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat your password"
          required
        />
      </label>

      {error ? (
        <p className="border-2 border-[var(--accent)] bg-[#fff4ef] px-3 py-3 text-sm font-semibold leading-6 text-[var(--accent-dark)]" role="alert">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="border-2 border-[var(--green)] bg-[#eef4ef] px-3 py-3 text-sm font-semibold leading-6 text-[var(--green)]" role="status">
          {notice}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="min-h-12 w-full border-2 border-[var(--foreground)] bg-[var(--accent)] px-4 font-black text-white shadow-[4px_4px_0_var(--foreground)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>

      <p className="text-center text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link className="font-bold text-[var(--foreground)] underline underline-offset-4" href="/login">
          Log in
        </Link>
      </p>
    </form>
  );
}
