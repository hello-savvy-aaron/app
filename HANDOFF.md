# Hello Savvy App — Handoff

## What it is
One Next.js app serving **two audiences by role**: an internal **admin** tool to run
the studio, and a **client portal**. Distinct from the marketing site (which lives in
`web/` → hellosavvy.design).

- **Live (production):** https://app.hellosavvy.design
- **Local path:** `/Users/aaron/dev/hello-savvy/app`
- **GitHub:** `hello-savvy-aaron/app` (public), git-connected to Vercel
- **Vercel project:** `app` (team `aa-rons-projects-c0936bb5` / `team_AQkbm6LZfXjBO7tNUkj5xUdz`)

## Stack
- **Next.js 16.2.6** (App Router), React 19, TypeScript, **Tailwind v4**, **shadcn/ui**
  (Radix + lucide + sonner). **Geist Sans/Mono** already loaded via `next/font`.
- **Supabase** for auth + Postgres + RLS (`@supabase/ssr` 0.10, `@supabase/supabase-js` 2.106).
- ⚠️ **Next 16 caveat:** middleware is renamed **`proxy`** — the file is `src/proxy.ts`
  exporting `proxy()`. `AGENTS.md` warns: read `node_modules/next/dist/docs/` before
  assuming older Next conventions.

## Design system — REQUIRED (v0.6)
The app **must adhere to** `docs/HelloSavvy-Design-System-v0.6.pdf` (repo root `docs/`).
Geist fonts are already correct; the gap is the **token layer** — `src/app/globals.css`
`@theme`/`:root` is still stock shadcn (pure-white bg, grayscale neutrals). To bring it
into adherence, map the shadcn semantic vars to v0.6 tokens:
- `--background` → **#FBF8F2** (warm cream — never pure white) · `--card`/elevated → #FFFFFF ·
  section tint #F5F1E8
- `--foreground` → **#0D1F1C** (near-black, never pure black) · secondary #4A5854 · tertiary #8A938F
- `--primary` → **#7C6FE0** (lavender) · hover #6557CC · soft #EEE9FB · deep #4A3E9E
- Display tier (for wordmark/emphasis/gradients): #5B47E5 → #8B5BD4 → #D8479A
- Secondary: mint #E8F5EE/#C8E8D4/#4FAE7A · pink #FBE9F1/#F8D8E5/#D8649A
- **lime #E5F0B8/#B8D442 — ONLY on stat pills & process numerals** (hard rule)
- Radius: round generously (cards 24px, containers 32px, buttons/pills fully rounded)
- Shadows: soft, diffused, hint of color — never harsh/pure-black
- Type: Geist; **2–3 weights only** (400 body / 500 nav-labels / 700 headlines)
- Gradients: **3 places only** — primary CTA, hero emphasis word, soft section bg
- Buttons: primary = lavender→pink gradient + white + pill + glow; secondary = soft-lavender
  fill + lavender text + pill; tertiary = bare lavender text + → ; sizes h36/h44/h52
**Tension to resolve with Aaron:** v0.6 is written for a *marketing site* ("should feel like
a well-made object, not a software dashboard"), but this is an admin dashboard. Recommended
path: apply the brand layer faithfully (palette, type, radius, buttons, cards, cream canvas)
while keeping pragmatic dashboard density (tables, compact spacing) rather than 144px section
gaps. Confirm before a full restyle.

## Auth model
- **Passwordless:** magic-link (email OTP) + **Google OAuth**. Both enabled & verified in Supabase.
- **Open signup** — anyone can register; new users default to role `client`.
- **Admin allowlist:** anyone signing up with an **`@hellosavvy.design`** email is
  auto-promoted to `admin` by a DB trigger. Everyone else is `client`. (To change: edit
  `admin_domain` in the migration's `handle_new_user()`.)
- Flow: `/login` (client component) → magic link or Google →
  `/auth/callback?code=…&redirectTo=…` exchanges the code → redirects by role. Root `/`
  redirects: not signed in → `/login`; admin → `/admin`; client → `/portal`.

## Data model (`supabase/migrations/0001_init.sql`)
- **profiles** — `id` (FK→auth.users), `email`, `full_name`, `role` (`admin`|`client`,
  default `client`), `created_at`
- **projects** — `id`, `name`, `description`, `status` (`active`|`paused`|`done`),
  `client_id` (FK→profiles, nullable), `created_at`
- **tasks** — `id`, `project_id` (FK→projects, cascade), `title`, `status`
  (`todo`|`in_progress`|`done`), `due_date`, `created_at`

**Functions/triggers:**
- `is_admin()` — SECURITY DEFINER, checks current user's role (avoids RLS recursion).
- `handle_new_user()` — on `auth.users` insert, creates the profile + assigns role via the allowlist.
- `guard_profile_role()` — before profile update, blocks non-admins from changing their own `role`.

**RLS (all 3 tables enabled):**
- profiles: read/update own row, or anything if admin.
- projects/tasks: **admin = full access**; **client = read-only** for rows they own
  (project `client_id = auth.uid()`, tasks via their project). No client write paths yet.

## Key files
- `src/proxy.ts` + `src/lib/supabase/proxy.ts` — session refresh + route gating
  (`/admin`, `/portal` require a user).
- `src/lib/auth.ts` — `getProfile()`, `requireProfile()`, `requireAdmin()` (admins-only;
  non-admins → `/portal`).
- `src/lib/supabase/{client,server,proxy}.ts` — Supabase clients. **Key resolution:**
  `NEXT_PUBLIC_SUPABASE_ANON_KEY || NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the fallback
  exists because the Supabase Vercel integration sets `PUBLISHABLE_KEY`).
- `src/app/login/` — login UI; `src/app/auth/callback/route.ts` — OAuth/magic-link
  exchange; `src/app/auth/signout/route.ts`.
- `src/app/admin/` — `layout.tsx`, `page.tsx` (projects list), `projects/[id]/page.tsx`
  (project + tasks), `actions.ts` (all CRUD as server actions, each calls `requireAdmin()` first).
- `src/app/portal/page.tsx` — **profile/welcome only** (v1 scope). RLS already supports
  adding client project views later.
- `src/components/admin/*`, `src/components/ui/*` (shadcn).

## Supabase project
- URL: `https://mtvdhqvdzrouhmfmokks.supabase.co` (ref `mtvdhqvdzrouhmfmokks`)
- Publishable/anon key: `sb_publishable_6q0os2C0XTsKaa-jHCd_JA_GJ0GxAcr` (browser-safe)
- Auth config: `site_url = https://app.hellosavvy.design`; redirect allowlist =
  `https://app.hellosavvy.design/auth/callback`, `http://localhost:3100/auth/callback`;
  **Google + email enabled**.
- Migration `0001_init.sql` **is applied**.

## Deployment
- **Git-connected:** push `main` → production (app.hellosavvy.design); `staging` branch
  exists for a staging deploy.
- **DNS:** name.com → CNAME `app` → Vercel.
- **Vercel env vars** (Production + Preview): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (both corrected — they were empty initially), plus the
  Supabase integration's `SUPABASE_*`/`POSTGRES_*`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Migrate workflow:** `.github/workflows/migrate.yml` runs `supabase db push` on changes
  to `supabase/migrations/**` on `main` — needs repo secret **`SUPABASE_DB_URL`** (Session
  pooler URI), not yet set.
- `DEPLOY.md` documents all of this.

## Run locally
```bash
cd /Users/aaron/dev/hello-savvy/app
# .env.local already has NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
PORT=3100 npm run dev   # use 3100 to avoid the marketing site's cookies on :3000
```
Apply migrations: Supabase dashboard SQL editor, or
`psql "<Session pooler URI>" -f supabase/migrations/0001_init.sql`, or the Management API
(`POST https://api.supabase.com/v1/projects/<ref>/database/query` with a `sbp_` token).

## Gotchas (learned the hard way)
- `vercel env add` via piped stdin stored **empty** values here → set env via the Vercel
  REST API; verify with `vercel env pull`.
- Supabase's **built-in email sender is hard rate-limited** — set up custom SMTP
  (Resend/Postmark/SES) for real magic-link volume.
- Google OAuth: the consent screen must be **published to Production** (not Testing) for
  ongoing use by any account.
- The production domain runs Vercel's **Security Checkpoint** → `curl` gets a challenge
  page; only real browsers reach the app.

## Product requirements (locked 2026-05-30)
- **Open signup**; everyone becomes a regular user by default. **Exactly two roles —
  `admin` (Hello Savvy employees, via @hellosavvy.design allowlist) and `user` (clients) —
  the only security boundary.** DECISION: **rename the DB role value `client` → `user`**
  (migration + code update still pending).
- **Core domain = projects + tasks.** A user logs in to **check the status of their own
  project(s)** (read-only in v1); admins manage everything.
- **One shared, role-gated app shell** (not separate /admin + /portal layouts): a standard
  **left sidebar**; for now it holds just **Projects** → a list you click into.
- **User v1 = read-only:** sees only projects assigned to them (RLS already enforces this),
  views status + tasks. No editing.
- **Communication (chat or raised issues) = fast-follow**, not v1. Direction TBD.
- **Logo:** the canonical mark is the full-word gradient **HelloSavvy** wordmark
  (`src/components/wordmark.tsx`, lavender→magenta gradient-clipped text). Use it
  everywhere; don't hand-roll the spans.

### Client model (decided 2026-05-30)
A `client` is the customer/account that owns projects. **`clients`** table; `profiles.client_id
→ clients` (each user belongs to ONE client; admins null); `projects.client_id` repointed
profiles→clients; signup auto-creates a client + links the user. Kept as a table even at 1:1
so a 2nd contact later is just another profile pointing at the same client — no project
re-migration. **Migration authored & staged: `supabase/migrations/0002_clients.sql`** (also
renames role client→user, updates `handle_new_user`, adds `current_client_id()`, repoints RLS).
NOT yet applied to the live DB.

### Build work this implies (not yet done)
1. **Apply `0002_clients.sql`** to the live DB (Management API needs a fresh Supabase PAT).
2. Update app code for the new model: `lib/types.ts` (role `admin|user`, add `Client`,
   `profiles.client_id`), admin project form (link a project to a **client**, not a profile),
   anywhere reading `role === 'client'`.
3. Refactor to a **shared role-gated app shell** with a left sidebar (Projects).
4. Rebuild the **user experience** from profile-only into a **read-only project tracker**
   (their client's projects → project detail with status + tasks).

## Outstanding / next steps
1. **Confirm end-to-end login** actually lands you in `/admin`.
2. **Revoke the Supabase PAT** that was used for setup, and **rotate the Google client
   secret** (both were pasted into chat during setup).
3. **Verify Google consent screen is "In production."**
4. Set up **custom SMTP** in Supabase.
5. Set the **`SUPABASE_DB_URL`** GitHub secret if you want auto-migrations.
6. Build out the **client portal** beyond profile-only (RLS is ready).
7. **v0.6 design-system adherence — DONE (2026-05-30, brand layer + pragmatic density):**
   token swap in `globals.css` (cream canvas, ink, lavender primary + display tier, mint/pink,
   soft tinted shadows, radius 1rem), fixed the `--font-sans` bug so Geist actually renders,
   pill+lavender Button with v0.6 sizes, soft-shadow Cards, palette status badges (no lime),
   HelloSavvy wordmark + cream→lavender gradient on login, branded admin sidebar. Login verified
   in preview. STILL TODO: eyeball `/admin` and `/portal` while logged in (same components, but
   confirm tables/forms read well).
