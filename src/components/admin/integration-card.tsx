"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  INTEGRATION_BY_PROVIDER,
  secretFields,
} from "@/lib/integrations/registry";
import { IntegrationFormDialog } from "@/components/admin/integration-form-dialog";
import type { ProjectIntegration } from "@/lib/types";

// A clickable product card on the project's Integrations tab. Shows the
// connection state and opens the setup dialog. Looks the def (incl. icon) up
// from the registry by provider so no React component is serialized from the
// server page.
export function IntegrationCard({
  projectId,
  provider,
  integration,
  setSecretFields,
}: {
  projectId: string;
  provider: string;
  integration: ProjectIntegration | null;
  setSecretFields: string[];
}) {
  const def = INTEGRATION_BY_PROVIDER[provider];
  const [open, setOpen] = useState(false);
  if (!def) return null;

  const Icon = def.icon;
  const hasConfig = integration
    ? Object.keys(integration.config).length > 0
    : false;
  const connected =
    Boolean(integration) && (setSecretFields.length > 0 || hasConfig);
  const disabled = Boolean(integration) && integration!.enabled === false;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-full flex-col gap-3 overflow-hidden rounded-xl bg-card p-4 text-left text-sm shadow-sm ring-1 ring-foreground/10 transition-colors hover:ring-brand-primary/40"
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-lg ring-1 ring-inset",
              def.accent,
            )}
          >
            <Icon className="size-5" />
          </span>
          {disabled ? (
            <Badge className="border-transparent bg-section-tint text-ink-secondary ring-1 ring-foreground/10">
              Disabled
            </Badge>
          ) : connected ? (
            <Badge className="border-transparent bg-mint-100 text-[#2f6f4f] ring-1 ring-mint-500/30">
              Connected
            </Badge>
          ) : (
            <Badge className="border-transparent bg-section-tint text-ink-tertiary ring-1 ring-foreground/10">
              Not connected
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          <p className="font-medium text-ink-primary">{def.label}</p>
          <p className="text-xs text-ink-secondary">{def.description}</p>
        </div>
        <span className="mt-auto text-xs font-medium text-brand-deep">
          {connected ? "Manage →" : "Set up →"}
        </span>
      </button>

      <IntegrationFormDialog
        def={def}
        projectId={projectId}
        integration={integration}
        setSecretFields={secretFields(def).filter((f) =>
          setSecretFields.includes(f),
        )}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
