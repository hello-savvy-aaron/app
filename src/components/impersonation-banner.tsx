"use client";

import { stopImpersonation } from "@/lib/impersonation-actions";

export function ImpersonationBanner({
  asEmail,
  asName,
}: {
  asEmail: string;
  asName: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4 bg-display-magenta/90 px-4 py-2 text-sm text-white backdrop-blur">
      <span>
        <span className="font-semibold">Admin preview</span> — viewing as{" "}
        <span className="font-semibold">{asName ?? asEmail}</span>{" "}
        <span className="opacity-75">({asEmail})</span>
      </span>
      <form action={stopImpersonation}>
        <button
          type="submit"
          className="rounded-full border border-white/40 px-3 py-0.5 text-xs font-semibold transition-colors hover:bg-white/20"
        >
          Exit
        </button>
      </form>
    </div>
  );
}
