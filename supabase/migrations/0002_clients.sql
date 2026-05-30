-- 0002: introduce the `clients` entity, rename role client->user, and repoint
-- projects from a person (profiles) to a client (clients).
--
-- Model: a client is the customer/account that owns projects. Each user belongs
-- to exactly one client (admins = null). Signup auto-creates a client + links it.
-- Safe to run once on the existing DB; backfills existing rows.

-- ---------------------------------------------------------------------------
-- 1. clients table
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);
alter table public.clients enable row level security;

-- ---------------------------------------------------------------------------
-- 2. profiles: role value client -> user, add client_id
-- ---------------------------------------------------------------------------
-- guard_profile_role (0001) reverts role changes when is_admin() is false; in the
-- migration context there's no auth.uid(), so it would block this rewrite. Disable
-- it for the duration of the role changes, then re-enable.
alter table public.profiles disable trigger guard_profile_role;
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'user' where role = 'client';
-- Keep allowlisted Hello Savvy staff as admins (covers existing rows that predate
-- the allowlist or were created as 'client').
update public.profiles set role = 'admin'
  where split_part(email, '@', 2) = 'hellosavvy.design';
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'user'));
alter table public.profiles alter column role set default 'user';
alter table public.profiles enable trigger guard_profile_role;
alter table public.profiles
  add column if not exists client_id uuid references public.clients (id) on delete set null;
create index if not exists profiles_client_id_idx on public.profiles (client_id);

-- ---------------------------------------------------------------------------
-- 3. backfill: one client per existing non-admin profile, then link
-- ---------------------------------------------------------------------------
do $$
declare
  p record;
  c uuid;
begin
  for p in
    select id, email, full_name from public.profiles
    where role = 'user' and client_id is null
  loop
    insert into public.clients (name)
      values (coalesce(nullif(p.full_name, ''), p.email))
      returning id into c;
    update public.profiles set client_id = c where id = p.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. repoint projects.client_id from profiles -> clients
--    Existing values currently hold profile ids; map each to that profile's client.
-- ---------------------------------------------------------------------------
alter table public.projects drop constraint if exists projects_client_id_fkey;
update public.projects pr
  set client_id = pf.client_id
  from public.profiles pf
  where pr.client_id = pf.id;
-- any project whose old client_id didn't match a profile becomes unassigned
update public.projects
  set client_id = null
  where client_id is not null
    and client_id not in (select id from public.clients);
alter table public.projects
  add constraint projects_client_id_fkey
  foreign key (client_id) references public.clients (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 5. helper: the current user's client id
-- ---------------------------------------------------------------------------
create or replace function public.current_client_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select client_id from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 6. new-user trigger: admins (allowlist) get no client; users get a client + link
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_domain constant text := 'hellosavvy.design';
  display text := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    new.email
  );
  c uuid;
begin
  if split_part(new.email, '@', 2) = admin_domain then
    insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, display, 'admin');
  else
    insert into public.clients (name) values (display) returning id into c;
    insert into public.profiles (id, email, full_name, role, client_id)
      values (new.id, new.email, display, 'user', c);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. RLS: clients + repointed project/task reads (admin = full, user = own client)
-- ---------------------------------------------------------------------------
drop policy if exists "clients: admin full access" on public.clients;
create policy "clients: admin full access"
  on public.clients for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "clients: user reads own" on public.clients;
create policy "clients: user reads own"
  on public.clients for select
  using (id = public.current_client_id());

drop policy if exists "projects: client reads own" on public.projects;
drop policy if exists "projects: user reads own" on public.projects;
create policy "projects: user reads own"
  on public.projects for select
  using (client_id = public.current_client_id());

drop policy if exists "tasks: client reads own" on public.tasks;
drop policy if exists "tasks: user reads own" on public.tasks;
create policy "tasks: user reads own"
  on public.tasks for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = tasks.project_id and p.client_id = public.current_client_id()
    )
  );
