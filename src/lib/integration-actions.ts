"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { str, nullableStr } from "@/lib/form";
import { INTEGRATION_BY_PROVIDER } from "@/lib/integrations/registry";

// Per-project integrations are admin-only (RLS enforces it too). Every action
// calls requireAdmin first. saveIntegration/deleteIntegration throw on failure
// (the dialog catches and surfaces the message); revealSecret returns the
// ActionResult shape since it's invoked from a client event handler.

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Upsert one integration block: non-secret fields → config, secret fields →
 *  Vault (only when a non-blank value is supplied; blank means "leave as is"). */
export async function saveIntegration(formData: FormData): Promise<void> {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const projectId = str(formData, "project_id");
  const provider = str(formData, "provider");
  const def = INTEGRATION_BY_PROVIDER[provider];
  if (!projectId) throw new Error("Missing project.");
  if (!def) throw new Error("Unknown integration.");

  // RLS-scoped lookup doubles as the access/existence check.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) throw new Error("That project no longer exists.");

  // Non-secret fields → config jsonb (rebuilt from the form on every save).
  const config: Record<string, string> = {};
  for (const f of def.fields) {
    if (f.kind === "secret") continue;
    const v = str(formData, f.name);
    if (v) config[f.name] = v;
  }

  const { data: row, error } = await supabase
    .from("project_integrations")
    .upsert(
      {
        project_id: projectId,
        provider,
        label: nullableStr(formData, "label"),
        config,
        enabled: formData.get("enabled") !== "false",
        created_by: profile.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,provider" },
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const integrationId = row.id as string;

  // Secret fields → Vault. A blank input keeps the stored value unchanged.
  for (const f of def.fields) {
    if (f.kind !== "secret") continue;
    const value = str(formData, f.name);
    if (!value) continue;
    const { error: secErr } = await supabase.rpc("set_project_secret", {
      p_integration_id: integrationId,
      p_field: f.name,
      p_value: value,
    });
    if (secErr) throw new Error(secErr.message);
  }

  revalidatePath(`/projects/${projectId}/integrations`);
}

/** Decrypt and return a single stored secret for display/copy. Admin-only. */
export async function revealSecret(args: {
  integrationId: string;
  field: string;
}): Promise<ActionResult<{ value: string | null }>> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("reveal_project_secret", {
      p_integration_id: args.integrationId,
      p_field: args.field,
    });
    if (error) throw new Error(error.message);
    return { ok: true, data: { value: (data as string | null) ?? null } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not reveal the secret.",
    };
  }
}

/** Disconnect an integration: deletes the row; the DB trigger purges its Vault
 *  secrets via the cascade on project_integration_secrets. */
export async function deleteIntegration(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const id = str(formData, "id");
  const projectId = str(formData, "project_id");
  if (!id) return;

  const { error } = await supabase
    .from("project_integrations")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (projectId) revalidatePath(`/projects/${projectId}/integrations`);
}
