# Deploying the Hello Savvy app

Target: **app.hellosavvy.design** (production) + **app-staging.hellosavvy.design**
(staging). Separate from the `web/` marketing site.

## How staging works

Vercel maps **git branches → domains**:

- `main` → **app.hellosavvy.design** (production branch)
- `staging` → **app-staging.hellosavvy.design** (staging branch)

Push to `staging` to auto-deploy the staging URL; merge to `main` to go live.
Custom domains are public even though raw `*.vercel.app` previews require a
Vercel login, so the staging domain is shareable. (If you prefer to mirror the
marketing site's `staging.hellosavvy.design` naming, use
`staging.app.hellosavvy.design` instead — just swap the host below.)

## 1. Apply the database migration (once)

Either paste `supabase/migrations/0001_init.sql` into **Supabase dashboard →
SQL Editor → Run**, or via psql (replace the password):

```bash
psql "postgresql://postgres:YOUR-PASSWORD@db.mtvdhqvdzrouhmfmokks.supabase.co:5432/postgres" \
  -f supabase/migrations/0001_init.sql
```

## 2. Create the GitHub repo (account: hello-savvy-aaron, public, SSH)

```bash
git add -A
git commit -m "Add Supabase auth, admin + portal, schema/RLS"
gh repo create hello-savvy-aaron/app --public --source=. --remote=origin
git remote set-url origin git@github.com:hello-savvy-aaron/app.git
git push -u origin main
git branch staging && git push -u origin staging
```

(Confirm the default branch is `main` with `git branch` first.)

## 3. Create the Vercel project (git-connected)

- vercel.com → **Add New → Project → Import** `hello-savvy-aaron/app`
  (Next.js auto-detected).
- Add **Environment Variables** (Production + Preview + Development):
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://mtvdhqvdzrouhmfmokks.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_6q0os2C0XTsKaa-jHCd_JA_GJ0GxAcr`
- Deploy, then **Settings → Git** → confirm **Production Branch = `main`**.

## 4. Domains

**Production** — Vercel → **Settings → Domains** → add
`app.hellosavvy.design`. Then at **name.com → DNS for hellosavvy.design**:

- Type `CNAME`, Host `app`, Answer `cname.vercel-dns.com` (use whatever Vercel
  displays).

**Staging** — same screen → add `app-staging.hellosavvy.design`, then set its
**Git Branch** field to `staging`. At name.com:

- Type `CNAME`, Host `app-staging`, Answer `cname.vercel-dns.com`.

## 5. Supabase auth config (dashboard)

**Authentication → URL Configuration:**

- Site URL: `https://app.hellosavvy.design`
- Redirect URLs:
  - `https://app.hellosavvy.design/auth/callback`
  - `https://app-staging.hellosavvy.design/auth/callback`
  - `http://localhost:3000/auth/callback`

**Authentication → Providers:**

- **Email** — enabled (magic links work by default).
- **Google** — enable, paste Client ID/Secret from Google Cloud Console. In
  Google Console set the **Authorized redirect URI** to
  `https://mtvdhqvdzrouhmfmokks.supabase.co/auth/v1/callback` and the authorized
  origins to your app domains.

## 6. Verify

Visit `https://app.hellosavvy.design` → redirects to `/login` → magic-link to a
**@hellosavvy.design** address → lands in `/admin`. A non-hellosavvy email lands
in `/portal`.

## Notes

- Keep pushes small (this network corrupts large git transfers); `node_modules`
  is gitignored so the source push is small.
- The commit author is `aaron@hellosavvy.design`, which matches a GitHub account
  on the Vercel team — required, or Vercel marks the deploy `BLOCKED`.
- Env var name: the code reads `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The Supabase
  agent-skills expect `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — if you adopt
  those, update the code to read either name.
