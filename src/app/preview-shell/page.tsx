"use client";

// TEMP visual-preview route — DELETE after screenshotting. Renders the app shell
// with mock data so the header/sidebar redesign can be reviewed without auth.
import { AppShell } from "@/components/app-shell";
import { Eyebrow } from "@/components/eyebrow";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

export default function PreviewShell() {
  return (
    <AppShell
      email="aaron@hellosavvy.design"
      subtitle="Admin"
      year={2026}
      isAdmin
      isImpersonating={false}
      projects={[
        { id: "1", name: "Haka Construction" },
        { id: "2", name: "Northwind Rebuild" },
      ]}
      clientOptions={[{ id: "c1", label: "Haka Construction" }]}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Eyebrow>Project</Eyebrow>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-[-0.02em]">
                Haka Construction
              </h1>
              <StatusBadge status="active" />
            </div>
            <p className="text-sm text-ink-secondary">
              Marketing site rebuild and project portal.
            </p>
          </div>
          <Button>Add document</Button>
        </div>
        <div className="rounded-xl bg-card p-6 text-sm text-ink-secondary shadow-sm ring-1 ring-foreground/10">
          Sample content card — confirms the canvas, eyebrow, and chrome read
          together.
        </div>
      </div>
    </AppShell>
  );
}
