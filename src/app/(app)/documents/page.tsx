import Link from "next/link";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/eyebrow";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentFormDialog } from "@/components/admin/document-form-dialog";
import type { Document, Project } from "@/lib/types";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = { pdf: "PDF", html: "HTML", link: "Link" };

export default async function DocumentsPage() {
  await requireAdmin();
  const supabase = await createClient();

  // Scope to the project chosen in the header switcher. The proxy persists the
  // last-opened project in this cookie, so the selection follows you here.
  const cookieStore = await cookies();
  const activeProjectId = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? null;

  // Resolve it (RLS-scoped — admins see every project). A stale/invalid cookie
  // resolves to null, which falls through to the "pick a project" prompt.
  let project: Pick<Project, "id" | "name"> | null = null;
  if (activeProjectId) {
    const { data } = await supabase
      .from("projects")
      .select("id,name")
      .eq("id", activeProjectId)
      .single();
    project = (data as Pick<Project, "id" | "name"> | null) ?? null;
  }

  const Header = (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <Eyebrow className="mb-2">Library</Eyebrow>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Documents</h1>
        <p className="text-sm text-ink-secondary">
          {project ? project.name : "No project selected"}
        </p>
      </div>
      {project && (
        <DocumentFormDialog
          projects={[{ id: project.id, label: project.name }]}
          lockedProject={{ id: project.id, label: project.name }}
          trigger={<Button>Add document</Button>}
        />
      )}
    </div>
  );

  if (!project) {
    return (
      <div className="mx-auto max-w-5xl">
        {Header}
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-ink-secondary">
          Pick a project from the switcher in the header to see its documents.
        </div>
      </div>
    );
  }

  const { data: docRows } = await supabase
    .from("documents")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });
  const docs = (docRows ?? []) as Document[];

  return (
    <div className="mx-auto max-w-5xl">
      {Header}

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-ink-secondary">
          No documents for {project.name} yet. Add your first one.
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
