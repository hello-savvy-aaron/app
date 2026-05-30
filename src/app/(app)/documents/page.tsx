import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentFormDialog } from "@/components/admin/document-form-dialog";
import type { Document } from "@/lib/types";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = { pdf: "PDF", html: "HTML", link: "Link" };

export default async function DocumentsPage() {
  const profile = (await getProfile())!;
  const isAdmin = profile.role === "admin";
  const supabase = await createClient();

  // RLS scopes: admins see all; users see their projects' documents.
  const { data: docRows } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });
  const docs = (docRows ?? []) as Document[];

  const { data: projRows } = await supabase.from("projects").select("id,name");
  const projectName = new Map(
    (projRows ?? []).map((p) => [p.id as string, p.name as string]),
  );
  const projectOptions = (projRows ?? []).map((p) => ({
    id: p.id as string,
    label: p.name as string,
  }));

  // Users: which docs they've already signed.
  const signed = new Set<string>();
  if (!isAdmin) {
    const { data: so } = await supabase
      .from("document_signoffs")
      .select("document_id")
      .eq("profile_id", profile.id);
    (so ?? []).forEach((r) => signed.add(r.document_id as string));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em]">Documents</h1>
          <p className="text-sm text-ink-secondary">
            {docs.length} document{docs.length === 1 ? "" : "s"}
          </p>
        </div>
        {isAdmin && (
          <DocumentFormDialog
            projects={projectOptions}
            trigger={<Button>Add document</Button>}
          />
        )}
      </div>

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-ink-secondary">
          {isAdmin
            ? "No documents yet. Add your first one."
            : "No documents yet. Anything we share with you will appear here."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>{isAdmin ? "Visibility" : "Project"}</TableHead>
                <TableHead>Sign-off</TableHead>
                <TableHead className="text-right">Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => {
                const where =
                  d.scope === "internal"
                    ? isAdmin
                      ? "Internal"
                      : "—"
                    : (d.project_id && projectName.get(d.project_id)) || "—";
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <Link href={`/documents/${d.id}`} className="hover:underline">
                        {d.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-ink-secondary">
                      {KIND_LABEL[d.kind]}
                    </TableCell>
                    <TableCell className="text-ink-secondary">{where}</TableCell>
                    <TableCell>
                      {!d.requires_signoff ? (
                        <span className="text-ink-tertiary">—</span>
                      ) : isAdmin ? (
                        <Badge className="border-transparent bg-brand-primary-soft text-brand-deep">
                          Required
                        </Badge>
                      ) : signed.has(d.id) ? (
                        <Badge className="border-transparent bg-mint-100 text-[#2f6f4f] ring-1 ring-mint-500/30">
                          Signed
                        </Badge>
                      ) : (
                        <Badge className="border-transparent bg-pink-100 text-pink-500 ring-1 ring-pink-500/30">
                          Needs sign-off
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-ink-secondary">
                      {new Date(d.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
