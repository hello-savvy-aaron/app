"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { revealSecret } from "@/lib/integration-actions";

// Reveal/hide + copy for a stored secret. Fetches plaintext on demand via the
// admin-only server action; the value lives only in local state and is never
// logged. Rendered next to a secret field once it's set.
export function RevealSecretButton({
  integrationId,
  field,
}: {
  integrationId: string;
  field: string;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (shown) {
      setShown(false);
      return;
    }
    setError(null);
    if (value !== null) {
      setShown(true);
      return;
    }
    setBusy(true);
    const res = await revealSecret({ integrationId, field });
    setBusy(false);
    if (res.ok) {
      setValue(res.data.value ?? "");
      setShown(true);
    } else {
      setError(res.error);
    }
  }

  async function copy() {
    if (value === null) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked; ignore.
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {shown && value !== null && (
        <>
          <code className="max-w-[14rem] truncate rounded bg-section-tint px-1.5 py-0.5 text-xs text-ink-secondary">
            {value || "(empty)"}
          </code>
          <button
            type="button"
            onClick={copy}
            className="text-ink-tertiary hover:text-brand-deep"
            title="Copy"
          >
            {copied ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        </>
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className="flex items-center gap-1 text-xs font-medium text-brand-deep hover:underline disabled:opacity-50"
      >
        {shown ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        {busy ? "…" : shown ? "Hide" : "Reveal"}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
