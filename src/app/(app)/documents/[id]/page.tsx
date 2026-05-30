import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentSignoff } from "@/components/document-signoff";
import { deleteDocument } from "@/lib/document-actions";
import type { Document, DocumentSignoff as Signoff } from "@/lib/types";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = { pdf: "PDF", html: "HTML", link: "Link" };

export default async function DocumentViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = (await getProfile())!;
  const isAdmin = profile.role === "admin";
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();
  if (!doc) notFound();
  const d = doc as Document;

  let projectLabel: string | null = null;
  if (d.project_id) {
    const { data: p } = await supabase
      .from("projects")
      .select("name")
      .eq("id", d.project_id)
      .single();
    projectLabel = p?.name ?? null;
  }

  // Signed URL for stored files (10 min). RLS on storage gates this per role.
  let fileUrl: string | null = null;
  let htmlContent: string | null = null;
  if (d.storage_path) {
    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(d.storage_path, 600);
    fileUrl = signed?.signedUrl ?? null;
    if (d.kind === "html") {
      // Storage serves uploaded HTML as text/plain (anti-XSS), so render the
      // content via the iframe's srcDoc rather than the signed URL.
      const { data: blob } = await supabase.storage
        .from("documents")
        .download(d.storage_path);
      if (blob) htmlContent = await blob.text();
    }
  }

  const { data: signoffRows } = await supabase
    .from("document_signoffs")
    .select("*")
    .eq("document_id", d.id)
    .order("signed_at", { ascending: true });
  const signoffs = (signoffRows ?? []) as Signoff[];
  const mySignoff = signoffs.find((s) => s.profile_id === profile.id);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/documents" className="text-sm text-ink-secondary hover:underline">
        ← Documents
      </Link>

      <div className="mt-3 mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-[-0.02em]">{d.title}</h1>
            <Badge className="border-transparent bg-section-tint text-ink-secondary">
              {KIND_LABEL[d.kind]}
            </Badge>
          </div>
          {d.description && (
            <p className="text-sm text-ink-secondary">{d.description}</p>
          )}
          {isAdmin && (
            <p className="text-xs text-ink-tertiary">
              {d.scope === "internal" ? "Internal" : `Project: ${projectLabel ?? "—"}`}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {fileUrl && (
            <Button asChild variant="outline">
              <a href={fileUrl} target="_blank" rel="noreferrer">
                Download
              </a>
            </Button>
          )}
          {isAdmin && (
            <form action={deleteDocument}>
              <input type="hidden" name="id" value={d.id} />
              <Button type="submit" variant="ghost">
                Delete
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Sign-off */}
      {d.requires_signoff && (
        <div className="mb-6">
          {isAdmin ? (
            <div className="rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
              <p className="mb-2 font-medium">Sign-offs</p>
              {signoffs.length === 0 ? (
                <p className="text-ink-tertiary">No sign-offs yet.</p>
              ) : (
                <ul className="space-y-1">
                  {signoffs.map((s) => (
                    <li key={s.id} className="text-ink-secondary">
                      {s.signed_name} —{" "}
                      {new Date(s.signed_at).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : mySignoff ? (
            <div className="rounded-xl bg-mint-100 p-4 text-sm text-[#2f6f4f] ring-1 ring-mint-500/30">
              You signed as <span className="font-medium">{mySignoff.signed_name}</span>{" "}
              on {new Date(mySignoff.signed_at).toLocaleDateString()}.
            </div>
          ) : (
            <DocumentSignoff documentId={d.id} />
          )}
        </div>
      )}

      {/* Viewer */}
      {d.kind === "link" ? (
        <Button asChild>
          <a href={d.external_url ?? "#"} target="_blank" rel="noreferrer">
            Open document ↗
          </a>
        </Button>
      ) : d.kind === "html" && htmlContent ? (
        <iframe
          srcDoc={htmlContent}
          title={d.title}
          sandbox="allow-scripts allow-popups allow-same-origin allow-forms"
          className="h-[80vh] w-full rounded-xl bg-white ring-1 ring-foreground/10"
        />
      ) : d.kind === "pdf" && fileUrl ? (
        <iframe
          src={fileUrl}
          title={d.title}
          className="h-[80vh] w-full rounded-xl bg-white ring-1 ring-foreground/10"
        />
      ) : (
        <p className="text-sm text-ink-secondary">This document can&apos;t be displayed.</p>
      )}
    </div>
  );
}
