"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reviseDocument } from "@/lib/document-actions";
import type { DocumentKind } from "@/lib/types";

// Admin-only: an instruction box that asks Claude to revise the document and
// saves the result in place. The hint adapts to what can actually change for the
// document's kind (HTML body vs. description for PDF/link).
const HINT: Record<DocumentKind, string> = {
  html: "Claude rewrites the document body and saves it in place.",
  pdf: "The PDF file can't be edited here — Claude revises the document description.",
  link: "The linked page can't be edited here — Claude revises the document description.",
};

export function DocumentReviseBox({
  documentId,
  kind,
}: {
  documentId: string;
  kind: DocumentKind;
}) {
  const router = useRouter();
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    const text = instruction.trim();
    if (!text || pending) return;
    setError(null);
    setDone(false);
    startTransition(async () => {
      const res = await reviseDocument({ documentId, instruction: text });
      if (res.ok) {
        setInstruction("");
        setDone(true);
        // Re-run the server component so the revised content renders.
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="mb-2 flex items-center gap-2">
        <SparklesIcon className="size-4 text-brand-deep" />
        <p className="text-sm font-medium">Revise with AI</p>
      </div>
      <Textarea
        value={instruction}
        onChange={(e) => {
          setInstruction(e.target.value);
          setDone(false);
        }}
        placeholder="e.g. Tighten the intro, fix the pricing table, and warm up the tone."
        rows={3}
        disabled={pending}
      />
      <p className="mt-1 text-xs text-ink-tertiary">{HINT[kind]}</p>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {done && !error && (
        <p className="mt-2 text-sm text-[#2f6f4f]">Document revised.</p>
      )}
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          onClick={submit}
          disabled={pending || !instruction.trim()}
        >
          {pending ? "Revising…" : "Revise document"}
        </Button>
      </div>
    </div>
  );
}
