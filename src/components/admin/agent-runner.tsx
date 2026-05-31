"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AgentTranscript } from "@/components/agent-transcript";
import { RunStatusBadge } from "@/components/run-status-badge";
import { runAgent } from "@/lib/agent-actions";
import type { RunStatus, TranscriptEntry } from "@/lib/types";

type Result = {
  runId: string;
  status: RunStatus;
  output: string;
  transcript: TranscriptEntry[];
  error: string | null;
};

export function AgentRunner({
  agentId,
  enabled,
  toolCount,
}: {
  agentId: string;
  enabled: boolean;
  toolCount: number;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    if (!input.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await runAgent({ agentId, input });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.data);
      // Refresh the server component so the new run shows in Recent runs.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The run failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      {!enabled && (
        <div className="rounded-lg bg-section-tint p-3 text-sm text-ink-secondary ring-1 ring-foreground/10">
          This agent is disabled. Enable it in Configuration below to run it.
        </div>
      )}

      <Textarea
        rows={3}
        placeholder="Message for the agent — e.g. “Summarize the open issues and suggest priorities.”"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={busy || !enabled}
      />

      <div className="flex items-center gap-3">
        <Button onClick={run} disabled={busy || !enabled || !input.trim()}>
          {busy ? "Running…" : "Run agent"}
        </Button>
        <span className="text-xs text-ink-tertiary">
          {toolCount} tool{toolCount === 1 ? "" : "s"} enabled
        </span>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <RunStatusBadge status={result.status} />
            <Link
              href={`/agents/${agentId}/runs/${result.runId}`}
              className="text-xs text-ink-secondary hover:underline"
            >
              Permalink
            </Link>
          </div>
          {result.error && (
            <p className="text-sm text-destructive">{result.error}</p>
          )}
          <AgentTranscript transcript={result.transcript} />
        </div>
      )}
    </section>
  );
}
