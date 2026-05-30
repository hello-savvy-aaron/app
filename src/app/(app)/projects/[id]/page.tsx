import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { ProjectFormDialog } from "@/components/admin/project-form-dialog";
import { TaskItem } from "@/components/admin/task-item";
import { createTask, deleteProject } from "@/lib/project-actions";
import type { Client, Project, Task } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = (await getProfile())!;
  const isAdmin = profile.role === "admin";
  const supabase = await createClient();

  // RLS ensures users can only fetch their own client's project.
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (!project) notFound();
  const p = project as Project;

  const { data: taskRows } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: true });
  const tasks = (taskRows ?? []) as Task[];

  // Admin-only: client list for the label + edit dialog.
  let clients: Client[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .order("name", { ascending: true });
    clients = (data ?? []) as Client[];
  }
  const clientName = clients.find((c) => c.id === p.client_id)?.name;
  const clientOptions = clients.map((c) => ({ id: c.id, label: c.name }));

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/projects"
        className="text-sm text-ink-secondary hover:underline"
      >
        ← Projects
      </Link>

      <div className="mt-3 mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-[-0.02em]">{p.name}</h1>
            <StatusBadge status={p.status} />
          </div>
          {p.description && (
            <p className="text-sm text-ink-secondary">{p.description}</p>
          )}
          {isAdmin && (
            <p className="text-xs text-ink-tertiary">
              Client: {clientName ?? "Unassigned"}
            </p>
          )}
        </div>
        {isAdmin && (
          <div className="flex shrink-0 gap-2">
            <ProjectFormDialog
              clients={clientOptions}
              project={p}
              trigger={<Button variant="outline">Edit</Button>}
            />
            <form action={deleteProject}>
              <input type="hidden" name="id" value={p.id} />
              <Button type="submit" variant="ghost">
                Delete
              </Button>
            </form>
          </div>
        )}
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold tracking-[-0.01em]">Tasks</h2>

        {isAdmin && (
          <form
            action={createTask}
            className="flex flex-wrap items-end gap-2 rounded-xl bg-section-tint p-3"
          >
            <input type="hidden" name="project_id" value={p.id} />
            <div className="flex-1 space-y-1">
              <Label htmlFor="title" className="text-xs">
                New task
              </Label>
              <Input id="title" name="title" required placeholder="Task title" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="due_date" className="text-xs">
                Due
              </Label>
              <Input id="due_date" name="due_date" type="date" />
            </div>
            <Button type="submit">Add</Button>
          </form>
        )}

        {tasks.length === 0 ? (
          <p className="text-sm text-ink-secondary">No tasks yet.</p>
        ) : isAdmin ? (
          <div className="space-y-2">
            {tasks.map((t) => (
              <TaskItem key={t.id} task={t} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10"
              >
                <span className="flex-1 text-sm">{t.title}</span>
                {t.due_date && (
                  <span className="text-xs text-ink-tertiary">
                    due {new Date(t.due_date).toLocaleDateString()}
                  </span>
                )}
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
