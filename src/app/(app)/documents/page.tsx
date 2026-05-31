import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
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
  // Internal documents are admin-only; client-facing docs live in their project.
  await requireAdmin();
  const supabase = await createClient();

  const { data: docRows } = await supabase
    .from("documents")
    .select("*")
    .eq("scope", "internal")
    .order("created_at", { ascending: false });
  const docs = (docRows ?? []) as Document[];

  // Project options for the "Add document" dialog (admin can scope to a project
  // from here too, though it defaults to internal).
  const { data: projRows } = await supabase.from("projects").select("id,name");
  const projectOptions = (projRows ?? []).map((p) => ({
    id: p.id as string,
    label: p.name as string,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em]">
            Internal documents
          </h1>
          <p className="text-sm text-ink-secondary">
            {docs.length} document{docs.length === 1 ? "" : "s"} · Hello Savvy only
          </p>
        </div>
        <DocumentFormDialog
          projects={projectOptions}
          defaultScope="internal"
          trigger={<Button>Add document</Button>}
        />
      </div>

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-ink-secondary">
          No internal documents yet. Add your first one.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">
                    <Link href={`/documents/${d.id}`} className="hover:underline">
                      {d.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-ink-secondary">
                    {KIND_LABEL[d.kind]}
                  </TableCell>
                  <TableCell className="text-right text-ink-secondary">
                    {new Date(d.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
