-- 0010: Per-document "internal" flag. Every document already belongs to a
-- project (migration 0007); this adds a flag that narrows a single document's
-- visibility to Hello Savvy admins, even when it sits on a client's project.
-- internal = false  -> visible to the project's client (current behaviour)
-- internal = true   -> admin-only, regardless of the project's client

alter table public.documents
  add column if not exists internal boolean not null default false;

-- Users only ever see non-internal documents on their own client's projects.
drop policy if exists "documents: user reads project docs" on public.documents;
create policy "documents: user reads project docs"
  on public.documents for select
  using (
    internal = false
    and project_id in (
      select id from public.projects where client_id = public.current_client_id()
    )
  );

-- Storage: a user may read a stored file only when its (non-internal) document
-- belongs to one of their client's projects.
drop policy if exists "doc objects: user reads visible" on storage.objects;
create policy "doc objects: user reads visible"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.storage_path = storage.objects.name
        and d.internal = false
        and d.project_id in (
          select id from public.projects where client_id = public.current_client_id()
        )
    )
  );

-- Sign-offs: clients can only sign documents they can see — i.e. non-internal
-- documents on their own projects. (An internal doc never needs a client's
-- sign-off.)
drop policy if exists "signoffs: user inserts own" on public.document_signoffs;
create policy "signoffs: user inserts own"
  on public.document_signoffs for insert
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.documents d
      where d.id = document_id
        and d.internal = false
        and d.project_id in (
          select id from public.projects where client_id = public.current_client_id()
        )
    )
  );
