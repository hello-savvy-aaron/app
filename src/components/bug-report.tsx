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
import { ACTIVE_PROJECT_COOKIE } from "@/lib/constants";

/** Read the live active-project id from the hs-project cookie. The proxy updates
 *  it on every /projects/[id] visit; the server-passed prop can lag behind it
 *  after client-side navigation (the app layout doesn't re-render), so the
 *  cookie is the source of truth at the moment the user files an issue. */
function readActiveProject(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${ACTIVE_PROJECT_COOKIE}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

// Header "report an issue" widget. A single description box → a GitHub issue on
// the active project's repo, mirrored into the issues table (reuses createIssue).
// Issues are project-scoped; the active project is read from the hs-project
// cookie so it tracks the current project on any page.
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
  // Seeded from the prop for first paint, then refreshed from the cookie each
  // time the popover opens (and re-read at submit) so it never goes stale.
  const [activeId, setActiveId] = useState<string | null>(activeProjectId);

  function reset() {
    setText("");
    setError(null);
    setDone(false);
    setPending(false);
  }

  async function submit() {
    const description = text.trim();
    // Re-read at submit time so the issue always lands on the current project.
    const projectId = readActiveProject() ?? activeProjectId;
    if (!description || !projectId || pending) return;
    setPending(true);
    setError(null);
    // One box → a concise title (first line) plus the full text as the body.
    const firstLine = description.split("\n")[0].trim();
    const title =
      firstLine.length > 120 ? firstLine.slice(0, 119) + "…" : firstLine;
    const fd = new FormData();
    fd.set("project_id", projectId);
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
        if (o) setActiveId(readActiveProject() ?? activeProjectId);
        else reset();
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
