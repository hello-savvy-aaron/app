import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/eyebrow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RunStatusBadge } from "@/components/run-status-badge";
import { AgentEditor } from "@/components/admin/agent-editor";
import { AgentRunner } from "@/components/admin/agent-runner";
import { deleteAgent } from "@/lib/agent-actions";
import { getToolCatalog } from "@/lib/agents/tools";
import type { Agent, AgentRun } from "@/lib/types";

export const dynamic = "force-dynamic";
// A tool-use loop can take a while. Raise the serverless ceiling (Vercel caps
// this to the plan's max; ignored in local dev).
export const maxDuration = 300;

type RunSummary = Pick<AgentRun, "id" | "status" | "input" | "created_at" | "steps">;

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();

  const { data: agentRow } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!agentRow) notFound();
  const agent = agentRow as Agent;

  const { data: projectRow } = await supabase
    .from("projects")
    .select("id,name")
    .eq("id", agent.project_id)
    .maybeSingle();
  const project = projectRow as { id: string; name: string } | null;

  const { data: runRows } = await supabase
    .from("agent_runs")
    .select("id,status,input,created_at,steps")
    .eq("agent_id", id)
    .order("created_at", { ascending: false })
    .limit(10);
  const runs = (runRows ?? []) as RunSummary[];

  const catalog = getToolCatalog();

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Eyebrow>Agent</Eyebrow>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-[-0.02em]">{agent.name}</h1>
            {agent.enabled ? (
              <Badge className="border-transparent bg-mint-100 text-[#2f6f4f] ring-1 ring-mint-500/30">
                Enabled
              </Badge>
            ) : (
              <Badge className="border-transparent bg-section-tint text-ink-secondary ring-1 ring-foreground/10">
                Disabled
              </Badge>
            )}
          </div>
          {project && (
            <p className="text-xs text-ink-tertiary">Project: {project.name}</p>
          )}
          {agent.description && (
            <p className="text-sm text-ink-secondary">{agent.description}</p>
          )}
        </div>
        <form action={deleteAgent}>
          <input type="hidden" name="id" value={agent.id} />
          <Button type="submit" variant="ghost">
            Delete
          </Button>
        </form>
      </div>

      <AgentRunner
        agentId={agent.id}
        enabled={agent.enabled}
        toolCount={agent.enabled_tools.length}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-[0.04em] text-ink-secondary uppercase">
          Recent runs
        </h2>
        {runs.length === 0 ? (
          <p className="text-sm text-ink-tertiary">No runs yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
            {runs.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-4 px-4 py-3 text-sm"
              >
                <Link
                  href={`/agents/${agent.id}/runs/${r.id}`}
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  {r.input}
                </Link>
                <span className="shrink-0 text-xs text-ink-tertiary">
                  {r.steps} step{r.steps === 1 ? "" : "s"}
                </span>
                <RunStatusBadge status={r.status} />
                <span className="hidden shrink-0 text-xs text-ink-tertiary sm:inline">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="text-lg font-bold tracking-[-0.01em]">Configuration</h2>
        <AgentEditor agent={agent} tools={catalog} />
      </section>
    </div>
  );
}
