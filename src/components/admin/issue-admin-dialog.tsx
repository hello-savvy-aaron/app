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
import { createManagedIssue, updateIssue } from "@/lib/issue-actions";
import type { Issue } from "@/lib/types";

type ProjectOption = { id: string; label: string };

/** Admin create/edit dialog for a local `issues` row. Manages the mirror table
 *  directly — it does not file or sync to GitHub (that's the per-project "New
 *  issue" flow). Mirrors ProjectFormDialog's structure. */
export function IssueAdminDialog({
  projects,
  issue,
  trigger,
}: {
  projects: ProjectOption[];
  issue?: Issue;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(issue);

  async function action(formData: FormData) {
    setError(null);
    try {
      if (isEdit) await updateIssue(formData);
      else await createManagedIssue(formData);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form action={action}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit issue" : "New issue"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the local issue record."
                : "Add a row to the issues table. This does not file an issue on GitHub."}
            </DialogDescription>
          </DialogHeader>

          {issue && <input type="hidden" name="id" value={issue.id} />}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={issue?.title ?? ""}
                placeholder="Short summary of the issue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Details</Label>
              <Textarea
                id="body"
                name="body"
                rows={4}
                defaultValue={issue?.body ?? ""}
                placeholder="What happened, what you expected, steps to reproduce…"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  name="project_id"
                  defaultValue={issue?.project_id ?? projects[0]?.id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>State</Label>
                <Select name="state" defaultValue={issue?.state ?? "open"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="github_number">GitHub #</Label>
                <Input
                  id="github_number"
                  name="github_number"
                  type="number"
                  min={1}
                  defaultValue={issue?.github_number ?? ""}
                  placeholder="e.g. 42"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github_url">GitHub URL</Label>
                <Input
                  id="github_url"
                  name="github_url"
                  type="url"
                  defaultValue={issue?.github_url ?? ""}
                  placeholder="https://github.com/owner/repo/issues/42"
                />
              </div>
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
