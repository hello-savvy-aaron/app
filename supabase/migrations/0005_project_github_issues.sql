-- 0005: GitHub integration — link a repo to each project and let users file
-- issues that are created on GitHub and mirrored locally for in-app display.
--
-- Model: admins set projects.github_repo_url; any user with access to a project
-- (the client's user or Hello Savvy staff) can create an issue. Each local
-- `issues` row is a cache of the GitHub issue (number + url + state) so the
-- project page can list issues without hitting the GitHub API on every load.
-- Safe to run once.

-- ---------------------------------------------------------------------------
-- 1. projects: store the linked GitHub repository (remote URL)
-- ---------------------------------------------------------------------------
alter table public.projects
  add column if not exists github_repo_url text;

-- ---------------------------------------------------------------------------
-- 2. issues table (local mirror of GitHub issues)
-- ---------------------------------------------------------------------------
create table if not exists public.issues (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  title         text not null,
  body          text,
  github_number integer,
  github_url    text,
  state         text not null default 'open' check (state in ('open', 'closed')),
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists issues_project_id_idx on public.issues (project_id);

alter table public.issues enable row level security;

-- ---------------------------------------------------------------------------
-- 3. RLS: admin = full access; user = read + create on their client's projects
--    (mirrors the tasks read policy and the document_signoffs insert policy)
-- ---------------------------------------------------------------------------
drop policy if exists "issues: admin full access" on public.issues;
create policy "issues: admin full access"
  on public.issues for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "issues: user reads own" on public.issues;
create policy "issues: user reads own"
  on public.issues for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = issues.project_id and p.client_id = public.current_client_id()
    )
  );

drop policy if exists "issues: user creates own" on public.issues;
create policy "issues: user creates own"
  on public.issues for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = issues.project_id and p.client_id = public.current_client_id()
    )
  );
