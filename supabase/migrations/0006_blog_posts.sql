-- 0005: Blog Studio posts. Every generated/published post is tied to a project
-- (project_id is required). Admin-only — the blog generator is an internal tool.

create table if not exists public.blog_posts (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  title          text not null,
  slug           text not null,
  description    text,
  tags           text[] not null default '{}',
  markdown       text not null,
  status         text not null default 'draft' check (status in ('draft', 'published')),
  committed_path text,        -- path in the site repo once published
  commit_url     text,        -- GitHub commit URL once published
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists blog_posts_project_id_idx on public.blog_posts (project_id);

alter table public.blog_posts enable row level security;

-- Admin-only: generated/published exclusively by Hello Savvy admins.
drop policy if exists "blog_posts: admin full" on public.blog_posts;
create policy "blog_posts: admin full"
  on public.blog_posts for all
  using (public.is_admin()) with check (public.is_admin());
