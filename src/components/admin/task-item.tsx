"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setTaskStatus, deleteTask } from "@/lib/project-actions";
import type { Task } from "@/lib/types";

export function TaskItem({ task }: { task: Task }) {
  const [pending, startTransition] = useTransition();

  function onStatusChange(status: string) {
    const fd = new FormData();
    fd.set("id", task.id);
    fd.set("project_id", task.project_id);
    fd.set("status", status);
    startTransition(() => setTaskStatus(fd));
  }

  function onDelete() {
    const fd = new FormData();
    fd.set("id", task.id);
    fd.set("project_id", task.project_id);
    startTransition(() => deleteTask(fd));
  }

  return (
    <div
      className="flex items-center gap-3 rounded-md border px-3 py-2"
      data-pending={pending ? "" : undefined}
    >
      <span className="flex-1 text-sm">{task.title}</span>
      {task.due_date && (
        <span className="text-xs text-muted-foreground">
          due {new Date(task.due_date).toLocaleDateString()}
        </span>
      )}
      <Select defaultValue={task.status} onValueChange={onStatusChange}>
        <SelectTrigger size="sm" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todo">To do</SelectItem>
          <SelectItem value="in_progress">In progress</SelectItem>
          <SelectItem value="done">Done</SelectItem>
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDelete}
        disabled={pending}
      >
        Delete
      </Button>
    </div>
  );
}
