-- 0007: Documents are always tied to a project. Reassign legacy "internal"
-- documents (project_id null) to the internal, client-less project, make
-- project_id required, and drop the internal/project scope concept — document
-- visibility now follows the project's client (no client => admin-only).

-- 1. Reassign any doc with no project to the earliest client-less project
--    (in prod that's "Hello Savvy"). No-op in environments with no orphan docs.
update public.documents
set project_id = (
  select id from public.projects where client_id is null order by created_at asc limit 1
)
where project_id is null;

-- 2. Drop the policies that reference `scope` BEFORE dropping the column —
--    Postgres refuses to drop a column a policy still depends on.
drop policy if exists "documents: user reads project docs" on public.documents;
drop policy if exists "doc objects: user reads visible" on storage.objects;

-- 3. Require a project on every document, then drop the redundant scope column.
alter table public.documents drop constraint if exists documents_scope_project_chk;
alter table public.documents alter column project_id set not null;
alter table public.documents drop column if exists scope;

-- 4. Recreate the read policies without scope (visibility = the project's
--    client). Admin policies never referenced scope, so they stay as-is.
create policy "documents: user reads project docs"
  on public.documents for select
  using (
    project_id in (
      select id from public.projects where client_id = public.current_client_id()
    )
  );

create policy "doc objects: user reads visible"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.storage_path = storage.objects.name
        and d.project_id in (
          select id from public.projects where client_id = public.current_client_id()
        )
    )
  );
