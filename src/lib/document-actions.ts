"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { resolveAnthropicKey } from "@/lib/integrations/resolve";
import { str, nullableStr } from "@/lib/form";
import type { DocumentKind } from "@/lib/types";

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
    // Internal docs stay admin-only even on a client's project (RLS enforces it).
    internal: formData.get("internal") === "on",
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

// Admin-only AI revision. The admin types an instruction; Claude revises the
// document and the result is saved in place (no version history yet). What gets
// revised depends on the document: HTML docs have their stored body rewritten;
// PDF/link docs (no editable body) have their description rewritten instead.
// Returns a result object — Next.js masks thrown server-action errors in prod,
// so we surface a legible message to the admin instead.
export type ReviseResult = { ok: true } | { ok: false; error: string };

const REVISE_MODEL = "claude-opus-4-8";
// Streaming lets us request a high ceiling; this covers a large (~90k-char)
// document in one pass. Anything that still hits the cap is rejected below
// rather than saved truncated.
const REVISE_MAX_TOKENS = 64000;

export async function reviseDocument(input: {
  documentId: string;
  instruction: string;
}): Promise<ReviseResult> {
  await requireAdmin();
  try {
    const instruction = input.instruction?.trim();
    if (!instruction) throw new Error("Tell the AI how to revise this document.");

    const supabase = await createClient();
    const { data: doc } = await supabase
      .from("documents")
      .select("id, title, description, kind, project_id, storage_path")
      .eq("id", input.documentId)
      .single();
    if (!doc) throw new Error("That document no longer exists.");

    const apiKey = await resolveAnthropicKey(supabase, doc.project_id as string);
    if (!apiKey) throw new Error("Claude is not configured on the server.");
    const anthropic = new Anthropic({ apiKey });

    if ((doc.kind as DocumentKind) === "html") {
      if (!doc.storage_path) {
        throw new Error("This document has no stored content to revise.");
      }
      const { data: blob, error: dlErr } = await supabase.storage
        .from("documents")
        .download(doc.storage_path as string);
      if (dlErr || !blob) throw new Error("Could not load the document content.");
      const currentHtml = await blob.text();

      // Stream: a full-document rewrite can exceed the non-streaming size/time
      // limit the SDK enforces, and streaming lets us request a high ceiling.
      const stream = anthropic.messages.stream({
        model: REVISE_MODEL,
        max_tokens: REVISE_MAX_TOKENS,
        system:
          "You are an expert editor revising a standalone HTML document. Apply " +
          "the user's instruction and return ONLY the complete, valid revised " +
          "HTML document — no explanation, no markdown, no code fences. Preserve " +
          "any structure and styling the instruction does not ask you to change.",
        messages: [
          {
            role: "user",
            content: `Instruction:\n${instruction}\n\nCurrent HTML document:\n${currentHtml}`,
          },
        ],
      });
      const msg = await stream.finalMessage();
      // Never overwrite the document with a truncated rewrite.
      if (msg.stop_reason === "max_tokens") {
        throw new Error(
          "This document is too long to revise in one pass — the result would " +
            "be cut off. Revise a shorter document or a specific section.",
        );
      }
      let html = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      html = html.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();
      if (!html) throw new Error("The AI returned an empty document.");

      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(
          doc.storage_path as string,
          new Blob([html], { type: "text/html" }),
          { contentType: "text/html", upsert: true },
        );
      if (upErr) throw new Error(upErr.message);
    } else {
      // PDF/link: the file/URL can't be edited here, so revise the description.
      const current = (doc.description as string | null) ?? "";
      const res = await anthropic.messages.create({
        model: REVISE_MODEL,
        max_tokens: 1024,
        system:
          "You revise a document's short description. Apply the user's " +
          "instruction and return ONLY the revised description as plain text — " +
          "no commentary, quotes, or markdown.",
        messages: [
          {
            role: "user",
            content: `Document title: ${doc.title}\nCurrent description: ${current || "(none)"}\n\nInstruction:\n${instruction}`,
          },
        ],
      });
      if (res.stop_reason === "max_tokens") {
        throw new Error("The revised description was cut off — try a shorter instruction.");
      }
      const description = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      if (!description) throw new Error("The AI returned an empty description.");

      const { error: updErr } = await supabase
        .from("documents")
        .update({ description })
        .eq("id", doc.id as string);
      if (updErr) throw new Error(updErr.message);
    }

    // Both viewer routes share the data; revalidate broadly so the revision
    // shows wherever the document is open.
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Revision failed." };
  }
}
