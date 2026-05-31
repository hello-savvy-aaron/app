import { cookies } from "next/headers";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/eyebrow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AgentFormDialog } from "@/components/admin/agent-form-dialog";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/constants";
import type { Agent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  // Admin-only. Project-scoped: agents belong to the active project (the one
  // chosen in the header switcher), same as Blog Studio / Issues.
  await requireAdmin();
  const supabase = await createClient();

  const cookieStore = await cookies();
  const activeProjectId = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? null;
  let activeProject: { id: string; name: string } | null = null;
  if (activeProjectId) {
    const { data } = await supabase
      .from("projects")
      .select("id,name")
      .eq("id", activeProjectId)
      .maybeSingle();
    activeProject = (data as { id: string; name: string } | null) ?? null;
  }

  let agents: Agent[] = [];
  if (activeProject) {
    const { data } = await supabase
      .from("agents")
      .select("*")
      .eq("project_id", activeProject.id)
      .order("updated_at", { ascending: false });
    agents = (data ?? []) as Agent[];
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Eyebrow className="mb-2">Automation</Eyebrow>
          <h1 className="text-2xl font-bold tracking-[-0.02em]">Agents</h1>
          <p className="text-sm text-ink-secondary">
            Build tool-using Claude agents scoped to a project, then run them here.
          </p>
        </div>
        {activeProject && (
          <AgentFormDialog
            project={{ id: activeProject.id, label: activeProject.name }}
            trigger={<Button>New agent</Button>}
          />
        )}
      </div>

      {!activeProject ? (
        <div className="rounded-lg bg-brand-primary-soft p-4 text-sm text-brand-deep">
          Select a project in the switcher above to view and build its agents.
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-8 text-center text-sm text-ink-secondary">
          No agents yet for{" "}
          <span className="font-medium text-ink-primary">
            {activeProject.name}
          </span>
          . Create the first one.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Tools</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    <Link href={`/agents/${a.id}`} className="hover:underline">
                      {a.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-ink-secondary">
                    {a.model.replace(/^claude-/, "")}
                  </TableCell>
                  <TableCell className="text-ink-secondary">
                    {a.enabled_tools.length}
                  </TableCell>
                  <TableCell>
                    {a.enabled ? (
                      <Badge className="border-transparent bg-mint-100 text-[#2f6f4f] ring-1 ring-mint-500/30">
                        Enabled
                      </Badge>
                    ) : (
                      <Badge className="border-transparent bg-section-tint text-ink-secondary ring-1 ring-foreground/10">
                        Disabled
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-ink-secondary">
                    {new Date(a.updated_at).toLocaleDateString()}
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
