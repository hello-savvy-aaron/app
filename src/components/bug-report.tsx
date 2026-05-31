"use client";

import { useState } from "react";
import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createIssue } from "@/lib/issue-actions";

// Header "report an issue" widget. A single description box → a GitHub issue on
// the active project's repo, mirrored into the issues table (reuses createIssue).
// Issues are project-scoped; activeProjectId is the layout-resolved selection
// (the hs-project cookie), so it works on any page once a project is chosen.
export function BugReport({
  activeProjectId,
}: {
  activeProjectId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const activeId = activeProjectId;

  function reset() {
    setText("");
    setError(null);
    setDone(false);
    setPending(false);
  }

  async function submit() {
    const description = text.trim();
    if (!description || !activeId || pending) return;
    setPending(true);
    setError(null);
    // One box → a concise title (first line) plus the full text as the body.
    const firstLine = description.split("\n")[0].trim();
    const title =
      firstLine.length > 120 ? firstLine.slice(0, 119) + "…" : firstLine;
    const fd = new FormData();
    fd.set("project_id", activeId);
    fd.set("title", title);
    fd.set("body", description);
    try {
      await createIssue(fd);
      setDone(true);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <PopoverTrigger
        aria-label="Report an issue"
        title="Report an issue"
        className="flex size-9 items-center justify-center rounded-full text-ink-secondary outline-none transition-colors hover:bg-brand-primary-soft hover:text-brand-deep focus-visible:ring-3 focus-visible:ring-ring/40 data-[state=open]:bg-brand-primary-soft data-[state=open]:text-brand-deep"
      >
        <Bug className="size-5" />
      </PopoverTrigger>

      <PopoverContent align="end">
        {done ? (
          <div className="space-y-3 text-sm">
            <p className="font-medium text-ink-primary">Thanks — issue created.</p>
            <p className="text-ink-secondary">
              We&rsquo;ll take a look. You can close this.
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        ) : activeId ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-3"
          >
            <p className="text-sm font-medium text-ink-primary">Report an issue</p>
            <Textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={4}
              disabled={pending}
              placeholder="What went wrong? Steps to reproduce, what you expected…"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              size="sm"
              className="w-full"
              disabled={pending || !text.trim()}
            >
              {pending ? "Creating…" : "Create issue"}
            </Button>
          </form>
        ) : (
          <div className="space-y-1.5 text-sm">
            <p className="font-medium text-ink-primary">Report an issue</p>
            <p className="text-ink-secondary">
              Open a project first, then report an issue against it.
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
