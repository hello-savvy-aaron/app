import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteIssue } from "@/lib/issue-actions";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/eyebrow";
import { StatusBadge } from "@/components/status-badge";
import { IssueAdminDialog } from "@/components/admin/issue-admin-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Issue, Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function IssuesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: issueRows } = await supabase
    .from("issues")
    .select("*")
    .order("created_at", { ascending: false });
  const issues = (issueRows ?? []) as Issue[];

  const { data: projectRows } = await supabase
    .from("projects")
    .select("id,name")
    .order("name", { ascending: true });
  const projects = (projectRows ?? []) as Pick<Project, "id" | "name">[];
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const projectOptions = projects.map((p) => ({ id: p.id, label: p.name }));

  const openCount = issues.filter((i) => i.state === "open").length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Eyebrow className="mb-2">Tracking</Eyebrow>
          <h1 className="text-2xl font-bold tracking-[-0.02em]">Issues</h1>
          <p className="text-sm text-ink-secondary">
            {issues.length} total ·{" "}
            <span className="text-ink-tertiary">{openCount} open</span> across all
            projects
          </p>
        </div>
        {projectOptions.length > 0 && (
          <IssueAdminDialog
            projects={projectOptions}
            trigger={<Button>New issue</Button>}
          />
        )}
      </div>

      {issues.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-ink-secondary">
          {projectOptions.length === 0
            ? "Create a project first — issues are filed against a project."
            : "No issues yet. Add the first one, or file one from a project page."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">
                    {i.github_url ? (
                      <a
                        href={i.github_url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {i.title}
                        {i.github_number != null && (
                          <span className="ml-1 text-ink-tertiary">
                            #{i.github_number}
                          </span>
                        )}
                      </a>
                    ) : (
                      <>
                        {i.title}
                        {i.github_number != null && (
                          <span className="ml-1 text-ink-tertiary">
                            #{i.github_number}
                          </span>
                        )}
                      </>
                    )}
                  </TableCell>
                  <TableCell className="text-ink-secondary">
                    {projectName.get(i.project_id) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={i.state} />
                  </TableCell>
                  <TableCell className="text-ink-secondary">
                    {new Date(i.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <IssueAdminDialog
                        projects={projectOptions}
                        issue={i}
                        trigger={
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        }
                      />
                      <form action={deleteIssue}>
                        <input type="hidden" name="id" value={i.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Delete
                        </Button>
                      </form>
                    </div>
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
