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
import { createDocument } from "@/lib/document-actions";

type ProjectOption = { id: string; label: string };

export function DocumentFormDialog({
  projects,
  trigger,
  lockedProject,
  defaultScope = "project",
}: {
  projects: ProjectOption[];
  trigger: React.ReactNode;
  /** When set, the dialog is opened from a project page: scope is forced to
   *  "project" and pinned to this project (no scope/project pickers shown). */
  lockedProject?: ProjectOption;
  /** Initial visibility when not locked to a project. */
  defaultScope?: "internal" | "project";
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"pdf" | "html" | "link">("pdf");
  const [scope, setScope] = useState<"internal" | "project">(defaultScope);
  const [error, setError] = useState<string | null>(null);

  async function action(formData: FormData) {
    setError(null);
    try {
      await createDocument(formData);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form action={action}>
          <DialogHeader>
            <DialogTitle>Add document</DialogTitle>
            <DialogDescription>
              Upload a file or link, and choose who can see it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required placeholder="Master agreement" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Optional summary"
              />
            </div>

            <div
              className={lockedProject ? "space-y-2" : "grid grid-cols-2 gap-4"}
            >
              <div className="space-y-2">
                <Label>Type</Label>
                <Select name="kind" value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="link">Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!lockedProject && (
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select name="scope" value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project">Project (client)</SelectItem>
                      <SelectItem value="internal">Internal (Hello Savvy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {lockedProject ? (
              <>
                <input type="hidden" name="scope" value="project" />
                <input type="hidden" name="project_id" value={lockedProject.id} />
              </>
            ) : (
              scope === "project" && (
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select name="project_id">
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a project" />
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
              )
            )}

            {kind === "link" ? (
              <div className="space-y-2">
                <Label htmlFor="external_url">URL</Label>
                <Input
                  id="external_url"
                  name="external_url"
                  type="url"
                  placeholder="https://…"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="file">File ({kind.toUpperCase()})</Label>
                <Input
                  id="file"
                  name="file"
                  type="file"
                  accept={kind === "pdf" ? "application/pdf,.pdf" : "text/html,.html,.htm"}
                />
              </div>
            )}

            {scope === "project" && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="requires_signoff" className="size-4" />
                Requires the client to sign off
              </label>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit">Add document</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
