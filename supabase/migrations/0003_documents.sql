-- 0003: Documents portal — documents + sign-offs, RLS, private Storage bucket.
-- Model: internal docs (admin-only) and project docs (visible to the project's
-- client). Lightweight sign-off = a row in document_signoffs.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  kind             text not null check (kind in ('pdf', 'html', 'link')),
  scope            text not null check (scope in ('internal', 'project')),
  project_id       uuid references public.projects (id) on delete cascade,
  storage_path     text,        -- object path in the 'documents' bucket (pdf/html)
  external_url     text,        -- when kind = 'link'
  requires_signoff boolean not null default false,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  -- project docs must reference a project; internal docs must not
  constraint documents_scope_project_chk check (
    (scope = 'project' and project_id is not null)
    or (scope = 'internal' and project_id is null)
  )
);
create index if not exists documents_project_id_idx on public.documents (project_id);

create table if not exists public.document_signoffs (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  signed_name text not null,
  signed_at   timestamptz not null default now(),
  unique (document_id, profile_id)
);

alter table public.documents        enable row level security;
alter table public.document_signoffs enable row level security;

-- ---------------------------------------------------------------------------
-- RLS: documents (admin = all; user = project docs for their client's projects)
-- ---------------------------------------------------------------------------
drop policy if exists "documents: admin full" on public.documents;
create policy "documents: admin full"
  on public.documents for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "documents: user reads project docs" on public.documents;
create policy "documents: user reads project docs"
  on public.documents for select
  using (
    scope = 'project'
    and project_id in (
      select id from public.projects where client_id = public.current_client_id()
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: sign-offs (admin = all; user reads own + inserts own for visible docs)
-- ---------------------------------------------------------------------------
drop policy if exists "signoffs: admin full" on public.document_signoffs;
create policy "signoffs: admin full"
  on public.document_signoffs for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "signoffs: user reads own" on public.document_signoffs;
create policy "signoffs: user reads own"
  on public.document_signoffs for select
  using (profile_id = auth.uid());

drop policy if exists "signoffs: user inserts own" on public.document_signoffs;
create policy "signoffs: user inserts own"
  on public.document_signoffs for insert
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.documents d
      where d.id = document_id
        and d.scope = 'project'
        and d.project_id in (
          select id from public.projects where client_id = public.current_client_id()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Private Storage bucket + object policies
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('documents', 'documents', false)
  on conflict (id) do nothing;

drop policy if exists "doc objects: admin all" on storage.objects;
create policy "doc objects: admin all"
  on storage.objects for all
  using (bucket_id = 'documents' and public.is_admin())
  with check (bucket_id = 'documents' and public.is_admin());

drop policy if exists "doc objects: user reads visible" on storage.objects;
create policy "doc objects: user reads visible"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.storage_path = storage.objects.name
        and d.scope = 'project'
        and d.project_id in (
          select id from public.projects where client_id = public.current_client_id()
        )
    )
  );
