-- 0009: Per-project integrations & secrets.
--
-- Admins configure external credentials (GitHub, Anthropic, OAuth, database,
-- custom) per project through the project's Integrations tab. Non-secret config
-- (repo, branch, client id, default model, …) lives in a jsonb column; secret
-- values are stored in Supabase Vault and referenced here by id only — plaintext
-- never lands in this schema, a backup dump, or a replication stream.
--
-- Admin-only, mirroring the RLS shape of agents (0008). Runtime code resolves a
-- project's credential first and falls back to the global env var.

create extension if not exists supabase_vault with schema vault;

-- One block per (project, provider). config holds the non-secret typed fields.
create table if not exists public.project_integrations (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  provider    text not null,                       -- 'github'|'anthropic'|'oauth'|'database'|'custom'
  label       text,                                -- optional friendly name
  config      jsonb not null default '{}'::jsonb,  -- non-secret fields only
  enabled     boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (project_id, provider)
);
create index if not exists project_integrations_project_id_idx
  on public.project_integrations (project_id);

-- Maps a secret field of an integration to a row in vault.secrets. Plaintext
-- never lives here. The cascade + the purge trigger keep Vault free of orphans.
create table if not exists public.project_integration_secrets (
  id              uuid primary key default gen_random_uuid(),
  integration_id  uuid not null references public.project_integrations (id) on delete cascade,
  field           text not null,                   -- 'token'|'api_key'|'client_secret'|…
  vault_secret_id uuid not null,                   -- vault.secrets.id
  updated_at      timestamptz not null default now(),
  unique (integration_id, field)
);
create index if not exists project_integration_secrets_integration_id_idx
  on public.project_integration_secrets (integration_id);

alter table public.project_integrations enable row level security;
alter table public.project_integration_secrets enable row level security;

-- Admin-only: configured and read exclusively by Hello Savvy admins.
drop policy if exists "project_integrations: admin full" on public.project_integrations;
create policy "project_integrations: admin full"
  on public.project_integrations for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "project_integration_secrets: admin full" on public.project_integration_secrets;
create policy "project_integration_secrets: admin full"
  on public.project_integration_secrets for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Vault wrappers. The vault schema is not exposed to PostgREST, so all access
-- goes through SECURITY DEFINER functions in public that self-guard with
-- is_admin() — matching the app's anon-key + JWT model (no service-role key).
-- vault.* is fully qualified; search_path is pinned empty for safety.
-- ---------------------------------------------------------------------------

-- Create or update the Vault secret backing one integration field.
create or replace function public.set_project_secret(
  p_integration_id uuid,
  p_field text,
  p_value text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorized.';
  end if;
  if p_value is null or length(btrim(p_value)) = 0 then
    raise exception 'A non-empty value is required.';
  end if;

  select vault_secret_id into v_existing
  from public.project_integration_secrets
  where integration_id = p_integration_id and field = p_field;

  if v_existing is null then
    insert into public.project_integration_secrets (integration_id, field, vault_secret_id)
    values (
      p_integration_id,
      p_field,
      vault.create_secret(p_value, 'pi:' || p_integration_id::text || ':' || p_field)
    );
  else
    perform vault.update_secret(v_existing, p_value);
    update public.project_integration_secrets
    set updated_at = now()
    where integration_id = p_integration_id and field = p_field;
  end if;
end;
$$;

-- Return the decrypted value for one integration field (null if unset).
create or replace function public.reveal_project_secret(
  p_integration_id uuid,
  p_field text
) returns text
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_value text;
begin
  if not public.is_admin() then
    raise exception 'Not authorized.';
  end if;

  select ds.decrypted_secret into v_value
  from public.project_integration_secrets s
  join vault.decrypted_secrets ds on ds.id = s.vault_secret_id
  where s.integration_id = p_integration_id and s.field = p_field;

  return v_value;
end;
$$;

-- Remove the backing Vault secret whenever a mapping row goes away — including
-- cascades from deleting an integration or its project.
create or replace function public.purge_integration_secret()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from vault.secrets where id = old.vault_secret_id;
  return old;
end;
$$;

drop trigger if exists project_integration_secrets_purge on public.project_integration_secrets;
create trigger project_integration_secrets_purge
  after delete on public.project_integration_secrets
  for each row execute function public.purge_integration_secret();

-- Only authenticated users may call the wrappers; the functions enforce
-- is_admin() internally. Never expose them to anon.
revoke all on function public.set_project_secret(uuid, text, text) from public, anon;
revoke all on function public.reveal_project_secret(uuid, text) from public, anon;
grant execute on function public.set_project_secret(uuid, text, text) to authenticated;
grant execute on function public.reveal_project_secret(uuid, text) to authenticated;
