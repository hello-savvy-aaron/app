-- Hello Savvy app: schema, roles, and RLS.
-- Run this in the Supabase SQL editor (or via the Supabase CLI) once.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'client' check (role in ('admin', 'client')),
  created_at  timestamptz not null default now()
);

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  status      text not null default 'active' check (status in ('active', 'paused', 'done')),
  client_id   uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  title       text not null,
  status      text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  due_date    date,
  created_at  timestamptz not null default now()
);

create index if not exists tasks_project_id_idx on public.tasks (project_id);
create index if not exists projects_client_id_idx on public.projects (client_id);

-- ---------------------------------------------------------------------------
-- Helper: is the current user an admin?
-- SECURITY DEFINER so it bypasses RLS and avoids policy recursion on profiles.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- New-user trigger: create a profile and assign role via the admin allowlist.
--
-- ADMIN ALLOWLIST: anyone signing up with an email on this domain becomes an
-- admin; everyone else becomes a client. Edit the domain (or switch to an
-- explicit email list) below to change who gets admin access.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_domain constant text := 'hellosavvy.design';
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    case
      when split_part(new.email, '@', 2) = admin_domain then 'admin'
      else 'client'
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Guard: clients cannot escalate their own role by updating their profile.
-- ---------------------------------------------------------------------------

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks    enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: update own or admin" on public.profiles;
create policy "profiles: update own or admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- projects ------------------------------------------------------------------
drop policy if exists "projects: admin full access" on public.projects;
create policy "projects: admin full access"
  on public.projects for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "projects: client reads own" on public.projects;
create policy "projects: client reads own"
  on public.projects for select
  using (client_id = auth.uid());

-- tasks ---------------------------------------------------------------------
drop policy if exists "tasks: admin full access" on public.tasks;
create policy "tasks: admin full access"
  on public.tasks for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "tasks: client reads own" on public.tasks;
create policy "tasks: client reads own"
  on public.tasks for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = tasks.project_id and p.client_id = auth.uid()
    )
  );
