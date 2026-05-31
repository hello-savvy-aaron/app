"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireProfile } from "@/lib/auth";
import type { DocumentKind } from "@/lib/types";

function str(fd: FormData, k: string): string {
  return (fd.get(k) as string | null)?.trim() ?? "";
}
function nullableStr(fd: FormData, k: string): string | null {
  const v = str(fd, k);
  return v === "" ? null : v;
}

export async function createDocument(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const title = str(formData, "title");
  const kind = str(formData, "kind") as DocumentKind;
  if (!title || !kind) return;

  // Every document belongs to a project (visibility follows the project's
  // client; a client-less project keeps the doc admin-only).
  const projectId = nullableStr(formData, "project_id");
  if (!projectId) throw new Error("Pick a project for this document.");

  let storagePath: string | null = null;
  let externalUrl: string | null = null;

  if (kind === "link") {
    externalUrl = nullableStr(formData, "external_url");
    if (!externalUrl) throw new Error("A URL is required for a link document.");
  } else {
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) throw new Error("A file is required.");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    storagePath = `${projectId}/${crypto.randomUUID()}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, {
        contentType:
          file.type || (kind === "pdf" ? "application/pdf" : "text/html"),
        upsert: false,
      });
    if (upErr) throw new Error(upErr.message);
  }

  const { error } = await supabase.from("documents").insert({
    title,
    description: nullableStr(formData, "description"),
    kind,
    project_id: projectId,
    storage_path: storagePath,
    external_url: externalUrl,
    requires_signoff: formData.get("requires_signoff") === "on",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/documents");
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteDocument(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const id = str(formData, "id");
  if (!id) return;

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (doc?.storage_path) {
    await supabase.storage.from("documents").remove([doc.storage_path]);
  }
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw new Error(error.message);

  // Project docs delete back to their project page; internal docs to /documents.
  const redirectTo = nullableStr(formData, "redirect_to") ?? "/documents";
  revalidatePath(redirectTo);
  redirect(redirectTo);
}

export async function signOffDocument(formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const documentId = str(formData, "document_id");
  const signedName = str(formData, "signed_name");
  if (!documentId || !signedName) return;

  const { error } = await supabase.from("document_signoffs").insert({
    document_id: documentId,
    profile_id: profile.id,
    signed_name: signedName,
  });
  if (error) throw new Error(error.message);

  // The same document is viewable at /documents/[id] (internal) or
  // /projects/[id]/documents/[docId] (project). Revalidate broadly so the
  // signed state shows wherever it's viewed.
  revalidatePath("/", "layout");
}
