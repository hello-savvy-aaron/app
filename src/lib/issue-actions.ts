"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, requireAdmin } from "@/lib/auth";
import { parseGitHubRepo, createGitHubIssue } from "@/lib/github";
import { resolveGithub } from "@/lib/integrations/resolve";
import { str, nullableStr, nullableInt } from "@/lib/form";
import type { IssueState } from "@/lib/types";

/** Create an issue on the project's linked GitHub repo and mirror it locally.
 *  Open to any signed-in user with access to the project (clients + admins);
 *  RLS scopes both the project lookup and the insert to the caller. */
export async function createIssue(formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const projectId = str(formData, "project_id");
  const title = str(formData, "title");
  if (!projectId || !title) return;

  // RLS returns the project only if the caller is allowed to see it, so this
  // doubles as the access check.
  const { data: project } = await supabase
    .from("projects")
    .select("id, github_repo_url")
    .eq("id", projectId)
    .single();
  if (!project) throw new Error("Project not found.");

  const repo = parseGitHubRepo(project.github_repo_url as string | null);
  if (!repo) {
    throw new Error("This project isn't linked to a GitHub repository yet.");
  }

  const body = nullableStr(formData, "body");
  // Prefer the project's own GitHub token (admins); falls back to the global env
  // token (incl. for client users, who can't see the integration row via RLS).
  const { token } = await resolveGithub(supabase, projectId);
  const issue = await createGitHubIssue(repo, { title, body }, token);

  // created_by must equal auth.uid() to satisfy the "user creates own" policy.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("issues").insert({
    project_id: projectId,
    title,
    body,
    github_number: issue.number,
    github_url: issue.htmlUrl,
    state: "open",
    created_by: user?.id ?? null,
  });
  // The GitHub issue already exists at this point; surface its URL so the user
  // doesn't retry and create a duplicate if only the local mirror failed.
  if (error) {
    throw new Error(
      `Issue created on GitHub (${issue.htmlUrl}), but saving it here failed: ${error.message}`,
    );
  }

  revalidatePath(`/projects/${projectId}`);
}

// ---------------------------------------------------------------------------
// Admin management of the local `issues` table (the GitHub mirror).
//
// Distinct from createIssue above: these operate on the local row directly and
// do NOT call the GitHub API. They're for the /issues admin screen — backfilling
// a mirror, correcting a title, flipping state, or pruning a stale row. The
// github_number/github_url fields are entered by hand. All require admin.
// ---------------------------------------------------------------------------

/** Admin: insert a local issue row (no GitHub call). */
export async function createManagedIssue(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const projectId = str(formData, "project_id");
  const title = str(formData, "title");
  if (!projectId || !title) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("issues").insert({
    project_id: projectId,
    title,
    body: nullableStr(formData, "body"),
    github_number: nullableInt(formData, "github_number"),
    github_url: nullableStr(formData, "github_url"),
    state: (str(formData, "state") || "open") as IssueState,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/issues");
  revalidatePath(`/projects/${projectId}`);
}

/** Admin: update a local issue row. */
export async function updateIssue(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const id = str(formData, "id");
  const projectId = str(formData, "project_id");
  if (!id || !projectId) return;

  const { error } = await supabase
    .from("issues")
    .update({
      project_id: projectId,
      title: str(formData, "title"),
      body: nullableStr(formData, "body"),
      github_number: nullableInt(formData, "github_number"),
      github_url: nullableStr(formData, "github_url"),
      state: str(formData, "state") as IssueState,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/issues");
  revalidatePath(`/projects/${projectId}`);
}

/** Admin: flip a single issue's state (open/closed) without touching the rest
 *  of the row or the GitHub issue. Backs the checkbox on the issues list. */
export async function setIssueState(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const id = str(formData, "id");
  const projectId = str(formData, "project_id");
  const state = str(formData, "state") as IssueState;
  if (!id) return;

  const { error } = await supabase.from("issues").update({ state }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/issues");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

/** Admin: delete a local issue row. Does not touch the GitHub issue. */
export async function deleteIssue(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const id = str(formData, "id");
  if (!id) return;

  const { error } = await supabase.from("issues").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/issues");
}
