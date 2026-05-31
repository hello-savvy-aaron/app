"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { createAgent } from "@/lib/agent-actions";

// Create-only: collects a name (+ optional description) for the active project,
// then routes to the agent's editor where prompt/tools/limits are configured.
export function AgentFormDialog({
  project,
  trigger,
}: {
  project: { id: string; label: string };
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function action(formData: FormData) {
    setError(null);
    try {
      const { id } = await createAgent(formData);
      setOpen(false);
      router.push(`/agents/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the agent.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form action={action}>
          <DialogHeader>
            <DialogTitle>New agent</DialogTitle>
            <DialogDescription>
              Create an agent for{" "}
              <span className="font-medium">{project.label}</span>. You&apos;ll
              configure its prompt and tools next.
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="project_id" value={project.id} />

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Issue triager" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="What this agent is for"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
