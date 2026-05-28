import { Badge } from "@/components/ui/badge";
import type { ProjectStatus, TaskStatus } from "@/lib/types";

const LABELS: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  done: "Done",
  todo: "To do",
  in_progress: "In progress",
};

const VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  in_progress: "default",
  paused: "secondary",
  todo: "outline",
  done: "secondary",
};

export function StatusBadge({ status }: { status: ProjectStatus | TaskStatus }) {
  return <Badge variant={VARIANTS[status] ?? "outline"}>{LABELS[status] ?? status}</Badge>;
}
