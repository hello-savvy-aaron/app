// Integration registry — the typed catalog of products an admin can connect to
// a project. Plain shared module (no "use server"/"server-only") so the server
// page/actions can read field definitions and client components can read the
// same defs plus the icon. Mirrors the shape of the agent TOOLS registry.
//
// Each field is either a `secret` (stored in Supabase Vault) or a non-secret
// (`text`/`url`/`select`, stored in the integration's `config` jsonb).

import { Bot, KeyRound, Database, Plug } from "lucide-react";
import { AGENT_MODELS } from "@/lib/agents/models";

export type FieldKind = "secret" | "text" | "url" | "select";

export type IntegrationField = {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
};

export type IntegrationDef = {
  provider: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  // Tailwind classes for the card's tinted icon chip.
  accent: string;
  fields: IntegrationField[];
};

// lucide dropped its brand icons, so ship the GitHub mark inline.
function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export const INTEGRATIONS: IntegrationDef[] = [
  {
    provider: "github",
    label: "GitHub",
    description:
      "Issues, repo file access, and Blog Studio publishing for this project.",
    icon: GithubMark,
    accent: "bg-foreground/5 text-foreground ring-foreground/10",
    fields: [
      {
        name: "token",
        label: "Personal access token",
        kind: "secret",
        required: true,
        placeholder: "ghp_…",
        help: "Needs Issues + Contents read/write on this project's repo.",
      },
      {
        name: "repo",
        label: "Repository (owner/repo)",
        kind: "text",
        placeholder: "owner/repo",
      },
      { name: "branch", label: "Branch", kind: "text", placeholder: "main" },
      {
        name: "posts_dir",
        label: "Posts directory",
        kind: "text",
        placeholder: "content/blog",
      },
    ],
  },
  {
    provider: "anthropic",
    label: "Anthropic",
    description:
      "Claude API key used by this project's agents and Blog Studio generation.",
    icon: Bot,
    accent: "bg-brand-primary-soft text-brand-deep ring-brand-primary/25",
    fields: [
      {
        name: "api_key",
        label: "API key",
        kind: "secret",
        required: true,
        placeholder: "sk-ant-…",
      },
      {
        name: "default_model",
        label: "Default model",
        kind: "select",
        options: AGENT_MODELS.map((m) => ({ value: m.value, label: m.label })),
      },
    ],
  },
  {
    provider: "oauth",
    label: "OAuth app",
    description:
      "OAuth 2.0 client credentials for connecting a third-party account.",
    icon: KeyRound,
    accent: "bg-mint-100 text-[#2f6f4f] ring-mint-500/30",
    fields: [
      { name: "client_id", label: "Client ID", kind: "text", required: true },
      {
        name: "client_secret",
        label: "Client secret",
        kind: "secret",
        required: true,
      },
      {
        name: "auth_url",
        label: "Authorization URL",
        kind: "url",
        placeholder: "https://…/authorize",
      },
      {
        name: "token_url",
        label: "Token URL",
        kind: "url",
        placeholder: "https://…/token",
      },
      { name: "scopes", label: "Scopes", kind: "text", placeholder: "read write" },
    ],
  },
  {
    provider: "database",
    label: "Database",
    description: "Connection string for an external database this project uses.",
    icon: Database,
    accent: "bg-section-tint text-ink-secondary ring-foreground/10",
    fields: [
      {
        name: "connection_string",
        label: "Connection string",
        kind: "secret",
        required: true,
        placeholder: "postgres://…",
      },
    ],
  },
  {
    provider: "custom",
    label: "Custom secret",
    description:
      "Any other API key or connecting info — store a named key and its value.",
    icon: Plug,
    accent: "bg-pink-100 text-pink-500 ring-pink-500/30",
    fields: [
      {
        name: "key",
        label: "Name",
        kind: "text",
        required: true,
        placeholder: "STRIPE_SECRET_KEY",
      },
      { name: "value", label: "Value", kind: "secret", required: true },
    ],
  },
];

export const INTEGRATION_BY_PROVIDER: Record<string, IntegrationDef> =
  Object.fromEntries(INTEGRATIONS.map((i) => [i.provider, i]));

/** Secret-kind field names for a provider (the ones backed by Vault). */
export function secretFields(def: IntegrationDef): string[] {
  return def.fields.filter((f) => f.kind === "secret").map((f) => f.name);
}
