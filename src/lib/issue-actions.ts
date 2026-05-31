"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { parseGitHubRepo, createGitHubIssue } from "@/lib/github";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

function nullableStr(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v === "" ? null : v;
}

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
  const issue = await createGitHubIssue(repo, { title, body });

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
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
}
