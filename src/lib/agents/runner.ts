import "server-only";

// The agent run loop. Drives an Anthropic tool-use conversation: call the model,
// execute any requested tools (scoped to the agent's project), feed results back,
// and repeat until the model finishes or the step cap is hit. The run row is
// inserted as 'running' before the first model call so a crash/timeout still
// leaves a record; it's updated to succeeded/failed at the end.

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TOOLS, type ToolContext, type ToolProject } from "@/lib/agents/tools";
import { getIntegration, resolveAnthropicKey } from "@/lib/integrations/resolve";
import type { Agent, RunStatus, TranscriptEntry } from "@/lib/types";

export type RunOutcome = {
  runId: string;
  status: RunStatus;
  output: string;
  steps: number;
  transcript: TranscriptEntry[];
  error: string | null;
};

export async function runAgent(args: {
  supabase: SupabaseClient;
  agent: Agent;
  project: ToolProject;
  profileId: string;
  input: string;
}): Promise<RunOutcome> {
  const { supabase, agent, project, profileId, input } = args;

  // Record the run up front so timeouts/crashes are still auditable.
  const { data: runRow, error: insertErr } = await supabase
    .from("agent_runs")
    .insert({
      agent_id: agent.id,
      project_id: agent.project_id,
      input,
      status: "running",
      model: agent.model,
      created_by: profileId,
    })
    .select("id")
    .single();
  if (insertErr || !runRow) {
    throw new Error(insertErr?.message ?? "Could not start the run.");
  }
  const runId = runRow.id as string;

  const transcript: TranscriptEntry[] = [];
  let steps = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let output = "";
  let status: RunStatus = "succeeded";
  let error: string | null = null;

  try {
    // Resolve the project's own Claude key (falls back to the global env var).
    const apiKey = await resolveAnthropicKey(supabase, agent.project_id);
    if (!apiKey) {
      throw new Error("Claude is not configured on the server.");
    }

    // Tool defs = the agent's allowlist intersected with the live registry.
    const active = agent.enabled_tools
      .map((n) => TOOLS[n])
      .filter((t): t is (typeof TOOLS)[string] => Boolean(t));
    const toolDefs: Anthropic.Tool[] = active.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }));

    const anthropic = new Anthropic({ apiKey });

    // Per-project GitHub creds for the GitHub tools: token (integration → env)
    // and an optional repo override from the integration's config.
    const gh = await getIntegration(supabase, agent.project_id, "github");
    const ghToken = (gh ? await gh.secret("token") : null) ?? process.env.GITHUB_TOKEN;
    const ctx: ToolContext = {
      supabase,
      project,
      profileId,
      github: { token: ghToken ?? undefined, repo: gh?.config.repo },
    };
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: input }];

    let finished = false;
    while (steps < agent.max_steps) {
      steps++;

      const res = await anthropic.messages.create({
        model: agent.model,
        max_tokens: agent.max_tokens,
        ...(agent.system_prompt ? { system: agent.system_prompt } : {}),
        ...(toolDefs.length ? { tools: toolDefs } : {}),
        messages,
      });
      inputTokens += res.usage.input_tokens;
      outputTokens += res.usage.output_tokens;

      const assistantText = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (assistantText) transcript.push({ type: "text", text: assistantText });

      // Keep the raw blocks for the next request turn. Response ContentBlocks
      // are accepted as ContentBlockParams by the API.
      messages.push({
        role: "assistant",
        content: res.content as Anthropic.ContentBlockParam[],
      });

      if (res.stop_reason !== "tool_use") {
        output = assistantText || output;
        finished = true;
        break;
      }

      // Execute each requested tool and feed results back.
      const toolUses = res.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        transcript.push({ type: "tool_call", name: tu.name, input: tu.input });
        const tool = TOOLS[tu.name];
        let out = "";
        let ok = true;
        if (!tool) {
          ok = false;
          out = `Unknown tool: ${tu.name}`;
        } else {
          try {
            out = await tool.execute(
              (tu.input ?? {}) as Record<string, unknown>,
              ctx,
            );
          } catch (e) {
            ok = false;
            out = e instanceof Error ? e.message : "Tool execution failed.";
          }
        }
        transcript.push({ type: "tool_result", name: tu.name, ok, output: out });
        results.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: out,
          ...(ok ? {} : { is_error: true }),
        });
      }
      messages.push({ role: "user", content: results });
    }

    if (!finished) {
      status = "failed";
      error = `Reached the step limit (${agent.max_steps}) before the agent finished. Increase Max steps and re-run.`;
    }
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message : "The run failed.";
  }

  await supabase
    .from("agent_runs")
    .update({
      status,
      output: output || null,
      transcript,
      steps,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      error,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);

  return { runId, status, output, steps, transcript, error };
}
