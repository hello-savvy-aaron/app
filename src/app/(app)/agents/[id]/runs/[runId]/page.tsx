import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/eyebrow";
import { RunStatusBadge } from "@/components/run-status-badge";
import { AgentTranscript } from "@/components/agent-transcript";
import type { Agent, AgentRun } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const { id, runId } = await params;
  await requireAdmin();
  const supabase = await createClient();

  const { data: runRow } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("id", runId)
    .eq("agent_id", id)
    .maybeSingle();
  if (!runRow) notFound();
  const run = runRow as AgentRun;

  const { data: agentRow } = await supabase
    .from("agents")
    .select("id,name")
    .eq("id", id)
    .maybeSingle();
  const agent = agentRow as Pick<Agent, "id" | "name"> | null;

  const durationSec = run.finished_at
    ? Math.max(
        0,
        (new Date(run.finished_at).getTime() -
          new Date(run.created_at).getTime()) /
          1000,
      )
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <Link
          href={`/agents/${id}`}
          className="text-xs text-ink-secondary hover:underline"
        >
          ← {agent?.name ?? "Agent"}
        </Link>
        <Eyebrow>Run</Eyebrow>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-[-0.02em]">Run output</h1>
          <RunStatusBadge status={run.status} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-tertiary">
          <span>{new Date(run.created_at).toLocaleString()}</span>
          {run.model && <span>{run.model}</span>}
          <span>
            {run.steps} step{run.steps === 1 ? "" : "s"}
          </span>
          {(run.input_tokens != null || run.output_tokens != null) && (
            <span>
              {run.input_tokens ?? 0} in / {run.output_tokens ?? 0} out tokens
            </span>
          )}
          {durationSec != null && <span>{durationSec.toFixed(1)}s</span>}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold tracking-[0.04em] text-ink-secondary uppercase">
          Input
        </h2>
        <div className="rounded-lg border border-border bg-card p-3 text-sm whitespace-pre-wrap">
          {run.input}
        </div>
      </section>

      {run.error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {run.error}
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold tracking-[0.04em] text-ink-secondary uppercase">
          Transcript
        </h2>
        <AgentTranscript transcript={run.transcript ?? []} />
      </section>
    </div>
  );
}
