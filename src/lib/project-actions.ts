"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { ProjectStatus, TaskStatus } from "@/lib/types";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

function nullableStr(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v === "" ? null : v;
}

export async function createProject(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const name = str(formData, "name");
  if (!name) return;

  const { error } = await supabase.from("projects").insert({
    name,
    description: nullableStr(formData, "description"),
    status: (str(formData, "status") || "active") as ProjectStatus,
    client_id: nullableStr(formData, "client_id"),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/projects");
}

export async function updateProject(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const id = str(formData, "id");
  if (!id) return;

  const { error } = await supabase
    .from("projects")
    .update({
      name: str(formData, "name"),
      description: nullableStr(formData, "description"),
      status: str(formData, "status") as ProjectStatus,
      client_id: nullableStr(formData, "client_id"),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
}

export async function deleteProject(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const id = str(formData, "id");
  if (!id) return;

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/projects");
  redirect("/projects");
}

export async function createTask(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const projectId = str(formData, "project_id");
  const title = str(formData, "title");
  if (!projectId || !title) return;

  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    title,
    status: (str(formData, "status") || "todo") as TaskStatus,
    due_date: nullableStr(formData, "due_date"),
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
}

export async function setTaskStatus(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const id = str(formData, "id");
  const projectId = str(formData, "project_id");
  const status = str(formData, "status") as TaskStatus;
  if (!id) return;

  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteTask(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const id = str(formData, "id");
  const projectId = str(formData, "project_id");
  if (!id) return;

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
}
