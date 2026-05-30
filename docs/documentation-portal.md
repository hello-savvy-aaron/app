# Documentation Portal — design write-up

Status: **decisions locked 2026-05-30.** Turns the app into a **repository of
documents** for two audiences, on top of the existing projects/tasks model.

## Purpose & audiences
The portal is where Hello Savvy stores and shares documents — and where clients
review and sign off on the ones meant for them.

- **Admins (HS employees):** see **internal** documents (GTM plans, playbooks,
  SOPs, templates) *and* every project's documents. The app doubles as the
  internal working portal.
- **Users (clients):** see documents on **their own projects** — agreements,
  proposals, plans, deliverables — including items that **need their sign-off**.

Reuses the role model already built: anyone signing in with a `@hellosavvy.design`
email is auto-made an **admin** (employee); everyone else is a **user** (client).
*(Already enforced by the `handle_new_user` trigger.)*

## Locked decisions
1. **Attachment = project-only.** Client-facing documents belong to a **project**;
   a client sees a doc because they own that project's account. No account-level
   docs in v1. **Internal** docs belong to Hello Savvy (no project, admin-only).
2. **Sign-off = lightweight acknowledge** — client types their name + clicks
   "I agree"; we store name + timestamp. (Not a legal e-signature integration.)
3. **GTM plan = wait for the full portal** — it lands as the first internal
   document when the portal is built (no interim hosting).

## Document types
- **PDF** — common case (agreements, proposals). Embedded viewer + download.
- **HTML** — rich self-contained docs like the 90-day GTM plan. Rendered in a
  **sandboxed iframe** so its styles/scripts can't leak into the app.
- **Link** — external URL (e.g. a Google Doc), shown as a link-out.

## Data model
```
documents
  id            uuid pk
  title         text
  description   text null
  kind          text  -- 'pdf' | 'html' | 'link'
  scope         text  -- 'internal' (HS only) | 'project' (client-visible)
  project_id    uuid null -> projects(id)   -- required when scope = 'project'; null when internal
  storage_path  text null  -- file in Supabase Storage (pdf/html)
  external_url  text null  -- when kind = 'link'
  requires_signoff boolean default false
  created_by    uuid -> profiles(id)
  created_at    timestamptz

document_signoffs            -- one row per acknowledgement
  id            uuid pk
  document_id   uuid -> documents(id)
  profile_id    uuid -> profiles(id)
  signed_at     timestamptz
  signed_name   text          -- typed name at sign-off
```

## Storage
- Files live in a **private Supabase Storage bucket** (`documents`) — never public.
- The app serves a file via a **short-lived signed URL generated server-side**,
  only after the same access check the table enforces.

## Access control (RLS)
- **internal** docs (`scope = 'internal'`): admins only.
- **project** docs (`scope = 'project'`): admins, plus users whose client owns
  that project — i.e. `documents.project_id` in
  `(select id from projects where client_id = current_client_id())`.
- Sign-offs: a user can insert their own acknowledgement for a document they can
  see; admins read all.

## Sign-off flow
A document flagged `requires_signoff` shows the client a **"Needs your sign-off"**
badge. They open it, review, type their name, click **"I agree."** That writes a
`document_signoffs` row (name + timestamp). Admins see who has / hasn't signed.

## UI / navigation
- New sidebar item **"Documents"** next to Projects.
- **Admin Documents:** **Internal** section (HS docs) + **per-project** documents
  (upload a file, pick scope, attach to a project, toggle requires-signoff, see
  sign-off status). Project docs also surface on the project's detail page.
- **Client Documents:** documents across their projects, with badges (Needs
  sign-off / Signed). Click to view (PDF viewer / HTML iframe) or download.

## The 90-day GTM plan
`HS GTM 90 day plan.html` ("The 90-Day Client Engine") = internal document
(`scope = internal`, `kind = html`, admin-only), self-contained (inline CSS/JS,
Geist + Instrument Serif). Renders in a sandboxed iframe. Becomes the first entry
in Internal docs when the portal is built — and is the proof-of-concept for the
HTML document type.

## Build phases
1. `documents` + `document_signoffs` tables, RLS, private Storage bucket (`0003`).
2. Admin Documents UI (upload, scope, attach-to-project, signoff toggle) +
   PDF/HTML/link viewers; seed the GTM plan as the first internal doc.
3. Client Documents UI + the lightweight sign-off flow.
