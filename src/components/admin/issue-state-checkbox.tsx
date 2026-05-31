"use client";

import { useTransition } from "react";
import { setIssueState } from "@/lib/issue-actions";
import type { Issue } from "@/lib/types";

/** Checkbox that closes an issue when checked (and reopens it when unchecked).
 *  Uses a transition so the row stays interactive while the action runs. */
export function IssueStateCheckbox({ issue }: { issue: Issue }) {
  const [pending, startTransition] = useTransition();
  const closed = issue.state === "closed";

  function onToggle(checked: boolean) {
    const fd = new FormData();
    fd.set("id", issue.id);
    fd.set("project_id", issue.project_id);
    fd.set("state", checked ? "closed" : "open");
    startTransition(() => setIssueState(fd));
  }

  return (
    <input
      type="checkbox"
      checked={closed}
      disabled={pending}
      onChange={(e) => onToggle(e.target.checked)}
      aria-label={closed ? "Reopen issue" : "Close issue"}
      title={closed ? "Reopen issue" : "Close issue"}
      className="size-4 cursor-pointer accent-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
