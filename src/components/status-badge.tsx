import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectStatus, TaskStatus } from "@/lib/types";

const LABELS: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  done: "Done",
  todo: "To do",
  in_progress: "In progress",
};

// v0.6 palette: lavender for in-flight, mint for success/done, warm-neutral for
// idle. Lime is reserved for stat pills/process numerals only — never status.
const STYLES: Record<string, string> = {
  active: "bg-brand-primary-soft text-brand-deep",
  in_progress: "bg-brand-primary-soft text-brand-deep",
  done: "bg-mint-100 text-[#2f6f4f] ring-1 ring-mint-500/30",
  paused: "bg-section-tint text-ink-secondary ring-1 ring-foreground/10",
  todo: "bg-transparent text-ink-tertiary ring-1 ring-foreground/15",
};

export function StatusBadge({ status }: { status: ProjectStatus | TaskStatus }) {
  return (
    <Badge className={cn("border-transparent", STYLES[status] ?? STYLES.todo)}>
      {LABELS[status] ?? status}
    </Badge>
  );
}
