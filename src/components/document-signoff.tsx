"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signOffDocument } from "@/lib/document-actions";

export function DocumentSignoff({ documentId }: { documentId: string }) {
  const [error, setError] = useState<string | null>(null);

  async function action(fd: FormData) {
    setError(null);
    try {
      await signOffDocument(fd);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-3 rounded-xl bg-brand-primary-soft p-4"
    >
      <input type="hidden" name="document_id" value={documentId} />
      <div className="flex-1 space-y-1">
        <label htmlFor="signed_name" className="text-xs font-medium text-brand-deep">
          Type your full name to acknowledge
        </label>
        <Input
          id="signed_name"
          name="signed_name"
          required
          placeholder="Your name"
          className="bg-elevated"
        />
      </div>
      <Button type="submit">I agree</Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </form>
  );
}
