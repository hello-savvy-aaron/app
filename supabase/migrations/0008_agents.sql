-- 0008: Agents — admin-built, project-scoped AI agents that run a Claude
-- tool-use loop. Every agent and every run is tied to a project
-- (project_id required). Admin-only — this is an internal Hello Savvy tool.
-- Mirrors the RLS shape of blog_posts (0006).

create table if not exists public.agents (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  name          text not null,
  description   text,
  model         text not null default 'claude-opus-4-8',
  system_prompt text not null default '',
  enabled_tools text[] not null default '{}',
  max_steps     int not null default 10 check (max_steps between 1 and 30),
  max_tokens    int not null default 4096 check (max_tokens between 256 and 16384),
  enabled       boolean not null default true,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists agents_project_id_idx on public.agents (project_id);

-- One row per execution. Inserted as 'running' up front so a crash/timeout
-- still leaves an auditable record; updated to succeeded/failed on completion.
create table if not exists public.agent_runs (
  id            uuid primary key default gen_random_uuid(),
  agent_id      uuid not null references public.agents (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  input         text not null,
  status        text not null default 'running'
                  check (status in ('running', 'succeeded', 'failed')),
  output        text,                          -- final assistant text
  transcript    jsonb not null default '[]'::jsonb,  -- normalized turn/tool trace
  steps         int not null default 0,
  input_tokens  int,
  output_tokens int,
  error         text,
  model         text,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index if not exists agent_runs_agent_id_idx on public.agent_runs (agent_id);
create index if not exists agent_runs_project_id_idx on public.agent_runs (project_id);

alter table public.agents enable row level security;
alter table public.agent_runs enable row level security;

-- Admin-only: built, run, and inspected exclusively by Hello Savvy admins.
drop policy if exists "agents: admin full" on public.agents;
create policy "agents: admin full"
  on public.agents for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "agent_runs: admin full" on public.agent_runs;
create policy "agent_runs: admin full"
  on public.agent_runs for all
  using (public.is_admin()) with check (public.is_admin());
