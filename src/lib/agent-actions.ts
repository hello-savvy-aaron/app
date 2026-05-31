"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { str, nullableStr } from "@/lib/form";
import { TOOLS, type ToolProject } from "@/lib/agents/tools";
import { runAgent as runAgentLoop, type RunOutcome } from "@/lib/agents/runner";
import { AGENT_MODEL_VALUES } from "@/lib/agents/models";
import type { Agent } from "@/lib/types";

// Agents are admin-only internal tools (RLS enforces it too). Every action calls
// requireAdmin first. CRUD throws on failure (Next masks the message in prod, but
// these are admin-facing dialogs that catch and surface it); runAgent returns the
// ActionResult shape since it's invoked from a client event handler.

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// Bounded to the table's CHECK constraints (migration 0008).
function clampInt(
  formData: FormData,
  key: string,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = Number(str(formData, key));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Create a bare agent for a project, then route the admin to its editor. */
export async function createAgent(formData: FormData): Promise<{ id: string }> {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const name = str(formData, "name");
  const projectId = str(formData, "project_id");
  if (!name) throw new Error("A name is required.");
  if (!projectId) throw new Error("Select a project first.");

  // RLS-scoped lookup doubles as the access/existence check.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) throw new Error("That project no longer exists.");

  const { data, error } = await supabase
    .from("agents")
    .insert({
      project_id: projectId,
      name,
      description: nullableStr(formData, "description"),
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/agents");
  return { id: data.id as string };
}

/** Update an agent's full configuration (prompt, tools, model, limits). */
export async function updateAgent(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const id = str(formData, "id");
  if (!id) throw new Error("Missing agent id.");

  const model = str(formData, "model");
  if (!AGENT_MODEL_VALUES.includes(model)) throw new Error("Unknown model.");

  const name = str(formData, "name");
  if (!name) throw new Error("A name is required.");

  // Keep only tool names that exist in the live registry.
  const enabledTools = formData
    .getAll("enabled_tools")
    .map(String)
    .filter((n) => n in TOOLS);

  const { error } = await supabase
    .from("agents")
    .update({
      name,
      description: nullableStr(formData, "description"),
      model,
      system_prompt: str(formData, "system_prompt"),
      enabled_tools: enabledTools,
      max_steps: clampInt(formData, "max_steps", 1, 30, 10),
      max_tokens: clampInt(formData, "max_tokens", 256, 16384, 4096),
      enabled: formData.get("enabled") === "true",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/agents");
  revalidatePath(`/agents/${id}`);
}

export async function deleteAgent(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const id = str(formData, "id");
  if (!id) return;

  const { error } = await supabase.from("agents").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/agents");
  redirect("/agents");
}

/** Run an agent against an input message and persist the run. */
export async function runAgent(args: {
  agentId: string;
  input: string;
}): Promise<ActionResult<RunOutcome>> {
  const profile = await requireAdmin();
  try {
    const supabase = await createClient();

    const input = args.input?.trim();
    if (!input) throw new Error("Enter a message to run the agent.");

    const { data: agentRow } = await supabase
      .from("agents")
      .select("*")
      .eq("id", args.agentId)
      .maybeSingle();
    if (!agentRow) throw new Error("Agent not found.");
    const agent = agentRow as Agent;
    if (!agent.enabled) {
      throw new Error("This agent is disabled. Enable it before running.");
    }

    const { data: projectRow } = await supabase
      .from("projects")
      .select("id,name,description,status,github_repo_url")
      .eq("id", agent.project_id)
      .maybeSingle();
    if (!projectRow) throw new Error("The agent's project no longer exists.");

    const outcome = await runAgentLoop({
      supabase,
      agent,
      project: projectRow as ToolProject,
      profileId: profile.id,
      input,
    });

    revalidatePath(`/agents/${agent.id}`);
    return { ok: true, data: outcome };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "The run failed." };
  }
}
