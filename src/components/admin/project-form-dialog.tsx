"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProject, updateProject } from "@/lib/project-actions";
import type { Project } from "@/lib/types";

type ClientOption = { id: string; label: string };

const UNASSIGNED = "__none__";

export function ProjectFormDialog({
  clients,
  project,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  clients: ClientOption[];
  project?: Project;
  /** Optional — omit when driving the dialog via the controlled `open` prop. */
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;
  const isEdit = Boolean(project);
  const [error, setError] = useState<string | null>(null);

  async function action(formData: FormData) {
    if (formData.get("client_id") === UNASSIGNED) formData.set("client_id", "");
    setError(null);
    try {
      if (isEdit) await updateProject(formData);
      else await createProject(formData);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <form action={action}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit project" : "New project"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the project details."
                : "Create a project and optionally assign a client."}
            </DialogDescription>
          </DialogHeader>

          {project && <input type="hidden" name="id" value={project.id} />}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={project?.name ?? ""}
                placeholder="Acme website redesign"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={project?.description ?? ""}
                placeholder="Short summary of the engagement"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select name="status" defaultValue={project?.status ?? "active"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Client</Label>
                <Select
                  name="client_id"
                  defaultValue={project?.client_id ?? UNASSIGNED}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="github_repo_url">GitHub repository</Label>
              <Input
                id="github_repo_url"
                name="github_repo_url"
                defaultValue={project?.github_repo_url ?? ""}
                placeholder="https://github.com/owner/repo"
              />
              <p className="text-xs text-ink-tertiary">
                Links this project to a repo so issues can be filed against it.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit">{isEdit ? "Save changes" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
