import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RunStatus } from "@/lib/types";

// v0.6 palette: lavender for in-flight, mint for success, pink for failure —
// matching status-badge.tsx's conventions for the project/issue states.
const STYLES: Record<RunStatus, string> = {
  running: "bg-brand-primary-soft text-brand-deep",
  succeeded: "bg-mint-100 text-[#2f6f4f] ring-1 ring-mint-500/30",
  failed: "bg-pink-100 text-pink-500 ring-1 ring-pink-500/30",
};

const LABELS: Record<RunStatus, string> = {
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
};

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return (
    <Badge className={cn("border-transparent", STYLES[status])}>
      {LABELS[status]}
    </Badge>
  );
}
