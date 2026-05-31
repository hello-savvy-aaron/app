"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { TranscriptEntry } from "@/lib/types";

// Compact markdown styling for assistant prose — same approach as Blog Studio's
// preview, sized down for the transcript.
const md = {
  h1: (p: React.ComponentProps<"h1">) => (
    <h1 className="mt-0 mb-2 text-lg font-semibold" {...p} />
  ),
  h2: (p: React.ComponentProps<"h2">) => (
    <h2 className="mt-3 mb-1 text-base font-semibold" {...p} />
  ),
  h3: (p: React.ComponentProps<"h3">) => (
    <h3 className="mt-3 mb-1 text-sm font-semibold" {...p} />
  ),
  p: (p: React.ComponentProps<"p">) => <p className="mb-2 last:mb-0" {...p} />,
  ul: (p: React.ComponentProps<"ul">) => (
    <ul className="mb-2 list-disc space-y-1 pl-5" {...p} />
  ),
  ol: (p: React.ComponentProps<"ol">) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5" {...p} />
  ),
  a: (p: React.ComponentProps<"a">) => (
    <a className="text-display-lavender underline" target="_blank" rel="noreferrer" {...p} />
  ),
  code: (p: React.ComponentProps<"code">) => (
    <code className="rounded bg-section-tint px-1 py-0.5 font-mono text-xs" {...p} />
  ),
};

export function AgentTranscript({
  transcript,
}: {
  transcript: TranscriptEntry[];
}) {
  if (!transcript || transcript.length === 0) {
    return <p className="text-sm text-ink-tertiary">No transcript.</p>;
  }

  return (
    <div className="space-y-3">
      {transcript.map((e, i) => {
        if (e.type === "text") {
          return (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-3 text-sm leading-6"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
                {e.text}
              </ReactMarkdown>
            </div>
          );
        }

        if (e.type === "tool_call") {
          return (
            <details
              key={i}
              className="rounded-lg bg-brand-primary-soft/50 p-3 text-sm ring-1 ring-brand-primary/15"
            >
              <summary className="cursor-pointer font-medium text-brand-deep">
                Called <code className="font-mono">{e.name}</code>
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-card p-2 font-mono text-xs">
                {JSON.stringify(e.input, null, 2)}
              </pre>
            </details>
          );
        }

        return (
          <details
            key={i}
            className={cn(
              "rounded-lg p-3 text-sm ring-1",
              e.ok
                ? "bg-section-tint ring-foreground/10"
                : "bg-destructive/10 ring-destructive/20",
            )}
          >
            <summary
              className={cn(
                "cursor-pointer font-medium",
                e.ok ? "text-ink-secondary" : "text-destructive",
              )}
            >
              <code className="font-mono">{e.name}</code>{" "}
              {e.ok ? "result" : "error"}
            </summary>
            <pre className="mt-2 max-h-72 overflow-auto rounded bg-card p-2 font-mono text-xs whitespace-pre-wrap">
              {e.output}
            </pre>
          </details>
        );
      })}
    </div>
  );
}
