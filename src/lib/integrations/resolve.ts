import "server-only";

// Runtime resolver: read a project's configured integration, falling back to the
// global env var when the project hasn't set its own. Server-only so the Vault
// reveal RPC and env vars never reach the client. Used by the agent runner,
// agent tools, Blog Studio, and issue creation.

import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolvedIntegration = {
  config: Record<string, string>;
  /** Decrypt a secret field for this integration (null if unset). */
  secret: (field: string) => Promise<string | null>;
};

/** Fetch an enabled integration for a project, or null. Returns null for
 *  callers RLS can't see it (e.g. non-admins) so resolution falls back to env. */
export async function getIntegration(
  supabase: SupabaseClient,
  projectId: string | null,
  provider: string,
): Promise<ResolvedIntegration | null> {
  if (!projectId) return null;
  const { data } = await supabase
    .from("project_integrations")
    .select("id, config, enabled")
    .eq("project_id", projectId)
    .eq("provider", provider)
    .maybeSingle();
  if (!data || data.enabled === false) return null;

  const integrationId = data.id as string;
  const config = (data.config ?? {}) as Record<string, string>;
  return {
    config,
    secret: async (field: string) => {
      const { data: value } = await supabase.rpc("reveal_project_secret", {
        p_integration_id: integrationId,
        p_field: field,
      });
      return (value as string | null) ?? null;
    },
  };
}

/** The Anthropic API key for a project, else the global ANTHROPIC_API_KEY. */
export async function resolveAnthropicKey(
  supabase: SupabaseClient,
  projectId: string | null,
): Promise<string | undefined> {
  const integ = await getIntegration(supabase, projectId, "anthropic");
  const key = integ ? await integ.secret("api_key") : null;
  return key ?? process.env.ANTHROPIC_API_KEY;
}

export type ResolvedGithub = {
  token?: string;
  repo?: string; // owner/repo
  branch: string;
  postsDir: string;
};

/** GitHub credentials/config for a project, each field falling back to env. */
export async function resolveGithub(
  supabase: SupabaseClient,
  projectId: string | null,
): Promise<ResolvedGithub> {
  const integ = await getIntegration(supabase, projectId, "github");
  const token = (integ ? await integ.secret("token") : null) ?? process.env.GITHUB_TOKEN;
  return {
    token: token ?? undefined,
    repo: integ?.config.repo ?? process.env.GITHUB_REPO ?? undefined,
    branch: integ?.config.branch ?? process.env.GITHUB_BRANCH ?? "main",
    postsDir: integ?.config.posts_dir ?? process.env.GITHUB_POSTS_DIR ?? "content/blog",
  };
}
