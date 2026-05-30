import Link from "next/link";
import { getProfile } from "@/lib/auth";
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
import { StatusBadge } from "@/components/status-badge";
import { ProjectFormDialog } from "@/components/admin/project-form-dialog";
import type { Client, Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const profile = (await getProfile())!; // layout guarantees an authed profile
  const isAdmin = profile.role === "admin";
  const supabase = await createClient();

  // RLS scopes this: admins see all projects, users see only their client's.
  const { data: projectRows } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  const rows = (projectRows ?? []) as Project[];

  // Admins need client labels + dropdown options for the New/Edit dialog.
  let clientLabel = new Map<string, string>();
  let clientOptions: { id: string; label: string }[] = [];
  if (isAdmin) {
    const { data: clientRows } = await supabase
      .from("clients")
      .select("*")
      .order("name", { ascending: true });
    const clients = (clientRows ?? []) as Client[];
    clientLabel = new Map(clients.map((c) => [c.id, c.name]));
    clientOptions = clients.map((c) => ({ id: c.id, label: c.name }));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em]">Projects</h1>
          <p className="text-sm text-ink-secondary">
            {rows.length} project{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        {isAdmin && (
          <ProjectFormDialog
            clients={clientOptions}
            trigger={<Button>New project</Button>}
          />
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-ink-secondary">
          {isAdmin
            ? "No projects yet. Create your first one."
            : "No projects yet. We'll post your project here once it kicks off."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead>Client</TableHead>}
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link href={`/projects/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-ink-secondary">
                      {p.client_id ? clientLabel.get(p.client_id) ?? "—" : "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-right text-ink-secondary">
                    {new Date(p.created_at).toLocaleDateString()}
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
