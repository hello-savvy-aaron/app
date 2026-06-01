import "server-only";

// Tool registry for project-scoped agents. Every tool runs server-side and is
// scoped to the agent's project: GitHub tools target the project's linked repo,
// data tools filter by project_id. Auth/admin gating lives in agent-actions.ts,
// which wraps the runner; these executors assume an already-authorized admin
// context and a project the caller can see.

import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseGitHubRepo, createGitHubIssue, type GitHubRepo } from "@/lib/github";
import type { ToolCatalogItem } from "@/lib/types";

export type ToolProject = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  github_repo_url: string | null;
};

export type ToolContext = {
  supabase: SupabaseClient;
  project: ToolProject;
  profileId: string;
  // Per-project GitHub creds resolved by the runner: token (integration → env)
  // and an optional repo override (integration config). Repo otherwise comes
  // from the project's linked github_repo_url.
  github?: { token?: string; repo?: string };
};

export type AgentTool = {
  name: string;
  label: string;
  description: string;
  // Mutating tools have real side effects (write to GitHub). Surfaced in the
  // editor so an admin opts into them explicitly.
  mutating: boolean;
  input_schema: Anthropic.Tool["input_schema"];
  execute: (input: Record<string, unknown>, ctx: ToolContext) => Promise<string>;
};

// Truncate large tool outputs so a single tool result can't blow the context.
const MAX_OUTPUT = 12_000;
function clamp(text: string): string {
  return text.length > MAX_OUTPUT
    ? text.slice(0, MAX_OUTPUT) + `\n\n…[truncated, ${text.length} chars total]`
    : text;
}

function str(input: Record<string, unknown>, key: string): string {
  const v = input[key];
  return typeof v === "string" ? v.trim() : "";
}

function ghHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "hellosavvy-agents",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

// Resolve the repo (integration override → project link) and token (integration
// → env, resolved upstream into ctx.github) for a GitHub tool call.
function requireGithub(ctx: ToolContext): { repo: GitHubRepo; token: string } {
  const repo = parseGitHubRepo(ctx.github?.repo ?? ctx.project.github_repo_url);
  if (!repo) {
    throw new Error("This project isn't linked to a GitHub repository.");
  }
  const token = ctx.github?.token;
  if (!token) {
    throw new Error("GitHub is not configured for this project.");
  }
  return { repo, token };
}

function contentsUrl(repo: { owner: string; repo: string }, path: string): string {
  const encoded = path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/${encoded}`;
}

export const TOOLS: Record<string, AgentTool> = {
  get_project: {
    name: "get_project",
    label: "Get project",
    description:
      "Get the current project's name, description, status, and linked GitHub repo URL.",
    mutating: false,
    input_schema: { type: "object", properties: {} },
    execute: async (_input, ctx) => {
      const p = ctx.project;
      return JSON.stringify(
        {
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          github_repo_url: p.github_repo_url,
        },
        null,
        2,
      );
    },
  },

  list_issues: {
    name: "list_issues",
    label: "List issues",
    description:
      "List issues tracked for this project (title, body, state, GitHub number/URL). Optionally filter by state.",
    mutating: false,
    input_schema: {
      type: "object",
      properties: {
        state: {
          type: "string",
          enum: ["open", "closed"],
          description: "Optional state filter.",
        },
      },
    },
    execute: async (input, ctx) => {
      let q = ctx.supabase
        .from("issues")
        .select("title,body,state,github_number,github_url,created_at")
        .eq("project_id", ctx.project.id)
        .order("created_at", { ascending: false })
        .limit(50);
      const state = str(input, "state");
      if (state === "open" || state === "closed") q = q.eq("state", state);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) return "No issues found for this project.";
      return clamp(JSON.stringify(data, null, 2));
    },
  },

  list_documents: {
    name: "list_documents",
    label: "List documents",
    description:
      "List documents attached to this project (title, kind, description, sign-off requirement, link).",
    mutating: false,
    input_schema: { type: "object", properties: {} },
    execute: async (_input, ctx) => {
      const { data, error } = await ctx.supabase
        .from("documents")
        .select("title,description,kind,requires_signoff,external_url,created_at")
        .eq("project_id", ctx.project.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      if (!data || data.length === 0)
        return "No documents found for this project.";
      return clamp(JSON.stringify(data, null, 2));
    },
  },

  github_list_files: {
    name: "github_list_files",
    label: "List repo files",
    description:
      "List files and directories at a path in the project's GitHub repo. Use an empty path for the repo root.",
    mutating: false,
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory path within the repo. Empty string for root.",
        },
      },
    },
    execute: async (input, ctx) => {
      const { repo, token } = requireGithub(ctx);
      const path = str(input, "path");
      const r = await fetch(contentsUrl(repo, path), {
        headers: ghHeaders(token),
        cache: "no-store",
      });
      if (r.status === 404) return `Path not found: ${path || "(root)"}`;
      if (!r.ok) throw new Error(`GitHub list failed (${r.status}).`);
      const data = await r.json();
      if (!Array.isArray(data)) {
        return `${path || "(root)"} is a file, not a directory. Use github_read_file.`;
      }
      const entries = data.map(
        (f: { type: string; path: string }) =>
          `${f.type === "dir" ? "[dir] " : "[file]"} ${f.path}`,
      );
      return clamp(entries.join("\n") || "(empty directory)");
    },
  },

  github_read_file: {
    name: "github_read_file",
    label: "Read repo file",
    description: "Read the text contents of a file in the project's GitHub repo.",
    mutating: false,
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path within the repo." },
      },
      required: ["path"],
    },
    execute: async (input, ctx) => {
      const { repo, token } = requireGithub(ctx);
      const path = str(input, "path");
      if (!path) throw new Error("A file path is required.");
      const r = await fetch(contentsUrl(repo, path), {
        headers: ghHeaders(token),
        cache: "no-store",
      });
      if (r.status === 404) return `File not found: ${path}`;
      if (!r.ok) throw new Error(`GitHub read failed (${r.status}).`);
      const data = await r.json();
      if (Array.isArray(data)) {
        return `${path} is a directory. Use github_list_files.`;
      }
      if (data.encoding !== "base64" || typeof data.content !== "string") {
        return "Could not decode file contents (it may be too large or binary).";
      }
      return clamp(Buffer.from(data.content, "base64").toString("utf8"));
    },
  },

  web_fetch: {
    name: "web_fetch",
    label: "Fetch web page",
    description:
      "Fetch a public web page or API endpoint by URL and return its text content (truncated). Only http(s) URLs.",
    mutating: false,
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Absolute http(s) URL." },
      },
      required: ["url"],
    },
    execute: async (input) => {
      const url = str(input, "url");
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new Error("Invalid URL.");
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Only http(s) URLs are allowed.");
      }
      const r = await fetch(parsed, {
        headers: { "User-Agent": "hellosavvy-agents" },
        redirect: "follow",
      });
      if (!r.ok) throw new Error(`Fetch failed (${r.status}).`);
      return clamp(await r.text());
    },
  },

  create_issue: {
    name: "create_issue",
    label: "Create GitHub issue",
    description:
      "Create a new GitHub issue on the project's linked repo and mirror it in the app. Writes to GitHub — use deliberately.",
    mutating: true,
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Issue title." },
        body: { type: "string", description: "Markdown issue body." },
      },
      required: ["title"],
    },
    execute: async (input, ctx) => {
      const { repo, token } = requireGithub(ctx);
      const title = str(input, "title");
      if (!title) throw new Error("An issue title is required.");
      const body = str(input, "body") || null;
      const issue = await createGitHubIssue(repo, { title, body }, token);
      const { error } = await ctx.supabase.from("issues").insert({
        project_id: ctx.project.id,
        title,
        body,
        github_number: issue.number,
        github_url: issue.htmlUrl,
        state: "open",
        created_by: ctx.profileId,
      });
      if (error) {
        return `Issue created on GitHub (${issue.htmlUrl}), but mirroring it in the app failed: ${error.message}`;
      }
      return `Created issue #${issue.number}: ${issue.htmlUrl}`;
    },
  },
};

/** Safe, serializable tool metadata for the editor UI (no executors). */
export function getToolCatalog(): ToolCatalogItem[] {
  return Object.values(TOOLS).map((t) => ({
    name: t.name,
    label: t.label,
    description: t.description,
    mutating: t.mutating,
  }));
}
