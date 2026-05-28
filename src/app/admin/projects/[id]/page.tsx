import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { ProjectFormDialog } from "@/components/admin/project-form-dialog";
import { TaskItem } from "@/components/admin/task-item";
import { createTask, deleteProject } from "@/app/admin/actions";
import type { Profile, Project, Task } from "@/lib/types";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();
  const p = project as Project;

  const [{ data: taskRows }, { data: clientProfiles }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("*").eq("role", "client"),
  ]);

  const tasks = (taskRows ?? []) as Task[];
  const clients = (clientProfiles ?? []) as Profile[];
  const client = clients.find((c) => c.id === p.client_id);
  const clientOptions = clients.map((c) => ({
    id: c.id,
    label: c.full_name ? `${c.full_name} (${c.email})` : c.email,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Projects
      </Link>

      <div className="mt-3 mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{p.name}</h1>
            <StatusBadge status={p.status} />
          </div>
          {p.description && (
            <p className="text-sm text-muted-foreground">{p.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Client:{" "}
            {client
              ? client.full_name
                ? `${client.full_name} (${client.email})`
                : client.email
              : "Unassigned"}
          </p>
        </div>
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
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Tasks</h2>

        <form
          action={createTask}
          className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-3"
        >
          <input type="hidden" name="project_id" value={p.id} />
          <div className="flex-1 space-y-1">
            <Label htmlFor="title" className="text-xs">
              New task
            </Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="Task title"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="due_date" className="text-xs">
              Due
            </Label>
            <Input id="due_date" name="due_date" type="date" />
          </div>
          <Button type="submit">Add</Button>
        </form>

        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks yet.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <TaskItem key={t.id} task={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
