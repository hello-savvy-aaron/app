export type Role = "admin" | "user";

export type ProjectStatus = "active" | "paused" | "done";
export type IssueState = "open" | "closed";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  client_id: string | null;
  created_at: string;
  // Only set during admin impersonation — not a DB column.
  _impersonating?: { adminEmail: string; adminId: string };
};

export type Client = {
  id: string;
  name: string;
  created_at: string;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  client_id: string | null;
  github_repo_url: string | null;
  created_at: string;
};

export type Issue = {
  id: string;
  project_id: string;
  title: string;
  body: string | null;
  github_number: number | null;
  github_url: string | null;
  state: IssueState;
  created_by: string | null;
  created_at: string;
};

export type DocumentKind = "pdf" | "html" | "link";

export type Document = {
  id: string;
  title: string;
  description: string | null;
  kind: DocumentKind;
  project_id: string;
  storage_path: string | null;
  external_url: string | null;
  requires_signoff: boolean;
  created_by: string | null;
  created_at: string;
};

export type DocumentSignoff = {
  id: string;
  document_id: string;
  profile_id: string;
  signed_name: string;
  signed_at: string;
};

// ---------------------------------------------------------------------------
// Agents — admin-built, project-scoped tool-using Claude agents (migration 0008).
// ---------------------------------------------------------------------------

export type RunStatus = "running" | "succeeded" | "failed";

export type Agent = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  model: string;
  system_prompt: string;
  enabled_tools: string[];
  max_steps: number;
  max_tokens: number;
  enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

// A normalized, UI/storage-friendly trace entry. The runner builds these
// alongside the raw Anthropic message array so the stored transcript is
// decoupled from the SDK's content-block shapes.
export type TranscriptEntry =
  | { type: "text"; text: string }
  | { type: "tool_call"; name: string; input: unknown }
  | { type: "tool_result"; name: string; ok: boolean; output: string };

export type AgentRun = {
  id: string;
  agent_id: string;
  project_id: string;
  input: string;
  status: RunStatus;
  output: string | null;
  transcript: TranscriptEntry[];
  steps: number;
  input_tokens: number | null;
  output_tokens: number | null;
  error: string | null;
  model: string | null;
  created_by: string | null;
  created_at: string;
  finished_at: string | null;
};

// Safe, serializable tool metadata for the editor UI (no executors).
export type ToolCatalogItem = {
  name: string;
  label: string;
  description: string;
  mutating: boolean;
};

// ---------------------------------------------------------------------------
// Project integrations — admin-managed, per-project external credentials
// (migration 0009). Non-secret config lives in `config`; secret values live in
// Supabase Vault, referenced from project_integration_secrets, never here.
// ---------------------------------------------------------------------------

export type ProjectIntegration = {
  id: string;
  project_id: string;
  provider: string;
  label: string | null;
  config: Record<string, string>;
  enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
