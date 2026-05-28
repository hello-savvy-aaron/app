# Hello Savvy app

The Hello Savvy workspace: one Next.js app serving two audiences by role.

- **Admin** (`/admin`) — internal tool to run the studio. v1: projects + tasks.
- **Client portal** (`/portal`) — v1: profile / welcome screen.

Built with Next.js 16 (App Router), Supabase (auth + Postgres + RLS),
Tailwind, and shadcn/ui.

## How auth works

- Passwordless: **magic link** email or **Google OAuth**.
- **Open signup** — anyone can register. New users default to the `client` role.
- **Admins** are assigned automatically via an allowlist: any email on the
  `hellosavvy.design` domain becomes an admin on signup. Everyone else is a
  client. (Change the domain, or switch to an explicit email list, in
  `supabase/migrations/0001_init.sql` → `handle_new_user`.)
- Access is enforced in two places: the `proxy.ts` (route gating) **and**
  Supabase Row-Level Security (data gating). Clients can never read another
  client's data even if the UI were bypassed.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables** — copy `.env.example` to `.env.local` and fill in
   your Supabase project URL and publishable (anon) key from
   Project Settings → API.

   ```bash
   cp .env.example .env.local
   ```

3. **Run the database migration** — open the Supabase dashboard → SQL Editor,
   paste the contents of `supabase/migrations/0001_init.sql`, and run it once.
   This creates the `profiles`, `projects`, and `tasks` tables, the RLS
   policies, and the signup trigger that assigns roles.

4. **Configure auth providers** in the Supabase dashboard → Authentication:
   - **Email** is on by default (magic links work out of the box).
   - **Google**: enable the Google provider and add your OAuth credentials.
   - **URL configuration**: add your site URL and redirect URLs, including
     `http://localhost:3000/auth/callback` for local dev (and the production
     equivalent, e.g. `https://app.hellosavvy.design/auth/callback`).

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000. You'll be redirected to `/login`.

## Becoming an admin

Sign up with an email on the `hellosavvy.design` domain and the signup trigger
makes you an admin automatically. To promote an existing user manually, run in
the SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

## Project structure

- `src/app/login` — shared sign-in screen (magic link + Google).
- `src/app/auth/callback` — OAuth / magic-link code exchange.
- `src/app/admin` — admin area (projects list, project detail with tasks).
- `src/app/portal` — client portal.
- `src/lib/supabase` — browser/server clients and the proxy session helper.
- `src/lib/auth.ts` — `getProfile` / `requireProfile` / `requireAdmin` helpers.
- `supabase/migrations/0001_init.sql` — schema + RLS + role trigger.
