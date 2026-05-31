"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { generateBlogDraft, publishBlogPost } from "@/lib/blog-actions";

type Status =
  | { type: "error"; text: string }
  | { type: "success"; text: string; url?: string };

// react-markdown element overrides — gives the preview readable styling without
// pulling in the tailwind typography plugin.
const mdComponents = {
  h1: (p: React.ComponentProps<"h1">) => (
    <h1 className="mt-0 mb-3 text-2xl font-bold tracking-[-0.02em]" {...p} />
  ),
  h2: (p: React.ComponentProps<"h2">) => (
    <h2 className="mt-6 mb-2 text-lg font-semibold" {...p} />
  ),
  h3: (p: React.ComponentProps<"h3">) => (
    <h3 className="mt-4 mb-2 text-base font-semibold" {...p} />
  ),
  p: (p: React.ComponentProps<"p">) => <p className="mb-3 text-sm leading-6" {...p} />,
  ul: (p: React.ComponentProps<"ul">) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-sm leading-6" {...p} />
  ),
  ol: (p: React.ComponentProps<"ol">) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm leading-6" {...p} />
  ),
  a: (p: React.ComponentProps<"a">) => (
    <a className="text-display-lavender underline" target="_blank" rel="noreferrer" {...p} />
  ),
  blockquote: (p: React.ComponentProps<"blockquote">) => (
    <blockquote className="mb-3 border-l-2 border-border pl-3 text-sm text-ink-secondary italic" {...p} />
  ),
};

export function BlogStudio() {
  // Generation inputs.
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tags, setTags] = useState("");
  const [wordCount, setWordCount] = useState(700);

  // Editable draft (populated after generation).
  const [hasDraft, setHasDraft] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [markdown, setMarkdown] = useState("");

  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await generateBlogDraft({ topic, keywords, tags, wordCount });
      if (!res.ok) {
        setStatus({ type: "error", text: res.error });
        return;
      }
      setTitle(res.data.title);
      setSlug(res.data.slug);
      setDescription(res.data.description);
      setMarkdown(res.data.markdown);
      setHasDraft(true);
      setTab("edit");
    } catch (e) {
      setStatus({ type: "error", text: e instanceof Error ? e.message : "Generation failed." });
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!hasDraft) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await publishBlogPost({ slug, title, description, tags, markdown });
      if (!res.ok) {
        setStatus({ type: "error", text: res.error });
        return;
      }
      setStatus({ type: "success", text: `Committed ${res.data.path}`, url: res.data.fileUrl });
    } catch (e) {
      setStatus({ type: "error", text: e instanceof Error ? e.message : "Publish failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Controls + metadata */}
      <section className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="topic">Topic / brief</Label>
          <Textarea
            id="topic"
            rows={3}
            placeholder="e.g. Composite vs. cedar decking for Colorado weather"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">Keywords (optional)</Label>
          <Input
            id="keywords"
            placeholder="Greenwood Village deck builder, low-maintenance decking"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              placeholder="decks, materials"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wordCount">Approx. word count</Label>
            <Input
              id="wordCount"
              type="number"
              value={wordCount}
              min={300}
              max={1500}
              step={50}
              onChange={(e) => setWordCount(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={generate} disabled={busy || !topic.trim()}>
            {busy ? "Working…" : hasDraft ? "Regenerate" : "Generate draft"}
          </Button>
          <Button variant="secondary" onClick={publish} disabled={busy || !hasDraft}>
            Commit to GitHub
          </Button>
        </div>

        {/* Editable front-matter fields, shown once there's a draft. */}
        {hasDraft && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Meta description</Label>
              <Textarea
                id="description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        )}

        {status && (
          <div
            className={
              status.type === "error"
                ? "rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                : "rounded-lg bg-mint-100 p-3 text-sm text-[#2f6f4f] ring-1 ring-mint-500/30"
            }
          >
            {status.text}{" "}
            {status.type === "success" && status.url && (
              <a className="underline" href={status.url} target="_blank" rel="noreferrer">
                view file
              </a>
            )}
          </div>
        )}
      </section>

      {/* Editor / preview */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 text-sm">
            <button
              type="button"
              onClick={() => setTab("edit")}
              className={cn(
                "rounded-full px-3 py-1 font-medium transition-colors",
                tab === "edit"
                  ? "bg-brand-primary-soft text-brand-deep"
                  : "text-ink-secondary hover:text-brand-deep",
              )}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setTab("preview")}
              className={cn(
                "rounded-full px-3 py-1 font-medium transition-colors",
                tab === "preview"
                  ? "bg-brand-primary-soft text-brand-deep"
                  : "text-ink-secondary hover:text-brand-deep",
              )}
            >
              Preview
            </button>
          </div>
          {hasDraft && <span className="text-xs text-ink-tertiary">{slug}.md</span>}
        </div>

        {tab === "edit" ? (
          <Textarea
            className="h-[28rem] font-mono text-xs"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="Generated markdown will appear here for review and editing…"
          />
        ) : (
          <div className="h-[28rem] overflow-auto rounded-lg border border-border bg-card p-4">
            {markdown.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {markdown}
              </ReactMarkdown>
            ) : (
              <p className="text-sm text-ink-tertiary">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
