"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { parseGitHubRepo } from "@/lib/github";
import { str, nullableStr } from "@/lib/form";
import type { ProjectStatus } from "@/lib/types";

export async function createProject(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const name = str(formData, "name");
  if (!name) return;

  const githubRepoUrl = nullableStr(formData, "github_repo_url");
  if (githubRepoUrl && !parseGitHubRepo(githubRepoUrl)) {
    throw new Error(
      "Enter a valid GitHub repository URL, e.g. https://github.com/owner/repo.",
    );
  }

  const { error } = await supabase.from("projects").insert({
    name,
    description: nullableStr(formData, "description"),
    status: (str(formData, "status") || "active") as ProjectStatus,
    client_id: nullableStr(formData, "client_id"),
    github_repo_url: githubRepoUrl,
  });
  if (error) throw new Error(error.message);

  // Refresh the header switcher (lives in the app layout) everywhere.
  revalidatePath("/", "layout");
}

export async function updateProject(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const id = str(formData, "id");
  if (!id) return;

  const githubRepoUrl = nullableStr(formData, "github_repo_url");
  if (githubRepoUrl && !parseGitHubRepo(githubRepoUrl)) {
    throw new Error(
      "Enter a valid GitHub repository URL, e.g. https://github.com/owner/repo.",
    );
  }

  const { error } = await supabase
    .from("projects")
    .update({
      name: str(formData, "name"),
      description: nullableStr(formData, "description"),
      status: str(formData, "status") as ProjectStatus,
      client_id: nullableStr(formData, "client_id"),
      github_repo_url: githubRepoUrl,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  revalidatePath(`/projects/${id}`);
}

export async function deleteProject(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const id = str(formData, "id");
  if (!id) return;

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  redirect("/");
}
