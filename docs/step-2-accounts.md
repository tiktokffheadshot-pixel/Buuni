# Buuni Step 2 — Accounts

Step 2 adds the permanent Supabase-backed account foundation.

## Local environment

Create `.env.local` in the repository root. Do not commit it.

Add exactly:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key-here
```

Get both values from the Supabase project's Connect/API settings. The publishable key is safe for browser use when Row Level Security is correctly configured. Never put a Supabase secret key or service key in the browser or in Git.

## Database setup

Run:

```text
supabase/migrations/20260922000100_create_profiles.sql
```

in the Supabase SQL Editor, or apply it through the Supabase CLI migration workflow.

This creates only the `public.profiles` table required by Step 2. It references `auth.users(id)` with `on delete cascade`.

The username rules are:

- 3–20 characters
- ASCII letters, numbers, and underscore only
- case-insensitive uniqueness
- the original casing is preserved for display

The case-insensitive uniqueness is enforced by the database with a unique index on `lower(username)`, so frontend validation cannot bypass it.

A database trigger creates the profile from the username supplied in Supabase Auth signup metadata. The trigger is a tightly scoped `security definer` function with an empty search path, following Supabase's recommended pattern.

## RLS

Profiles have Row Level Security enabled.

Authenticated users can select, insert, update, or delete only the row whose `id` equals their authenticated Supabase user ID. Unauthenticated clients receive no profile access.

The application never accepts a client-supplied user ID for authorization. The account page obtains the authenticated user from Supabase Auth on the server and queries the profile by that verified ID.

## Authentication

Buuni uses:

- Supabase Auth
- email + password only
- `@supabase/ssr` cookie-based SSR sessions
- PKCE through the Supabase SSR client
- Next.js 16 `proxy.ts` to refresh sessions
- server-side `getUser()` checks for protected account data
- browser Supabase client for signup/login

No custom password hashing, JWT handling, or session storage is implemented.

## Email confirmation

Supabase projects commonly have email confirmation enabled by default. With confirmation enabled, `signUp()` creates the account but returns no active session until the user confirms the email. Buuni therefore shows a confirmation message in that case.

If you want signup to immediately establish a session and redirect to `/account` without email confirmation, disable Email Confirmations in the Supabase Auth settings. That setting is a project-level security decision and is not changed by this repository.

## Verification

The repository-side implementation was committed without real Supabase credentials, so the account flow cannot be end-to-end tested until a Supabase project is connected locally.

After adding `.env.local` and applying the migration, run:

```bash
npm install
npm run lint
npm run typecheck
npm run build
npm run dev
```

Then manually verify signup, login, session persistence, `/account` protection, logout, and duplicate username rejection.
