"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RevealSecretButton } from "@/components/admin/reveal-secret-button";
import { saveIntegration, deleteIntegration } from "@/lib/integration-actions";
import type { IntegrationDef } from "@/lib/integrations/registry";
import type { ProjectIntegration } from "@/lib/types";

// Setup dialog for one integration. Renders inputs from the registry: secret
// fields write to Vault (blank = leave unchanged) and expose a Reveal control
// once set; non-secret fields persist to the integration's config.
export function IntegrationFormDialog({
  def,
  projectId,
  integration,
  setSecretFields,
  open,
  onOpenChange,
}: {
  def: IntegrationDef;
  projectId: string;
  integration: ProjectIntegration | null;
  setSecretFields: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) setError(null);
  }

  async function save(formData: FormData) {
    setError(null);
    setBusy(true);
    try {
      await saveIntegration(formData);
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(formData: FormData) {
    setError(null);
    setBusy(true);
    try {
      await deleteIntegration(formData);
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not disconnect.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <form action={save}>
          <DialogHeader>
            <DialogTitle>{def.label}</DialogTitle>
            <DialogDescription>{def.description}</DialogDescription>
          </DialogHeader>

          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="provider" value={def.provider} />

          <div className="space-y-4 py-4">
            {def.fields.map((field) => {
              const current = integration?.config[field.name] ?? "";
              const isSet = setSecretFields.includes(field.name);

              if (field.kind === "select") {
                return (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Select
                      name={field.name}
                      defaultValue={current || field.options?.[0]?.value}
                    >
                      <SelectTrigger id={field.name} className="w-full">
                        <SelectValue placeholder={`Select ${field.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }

              if (field.kind === "secret") {
                return (
                  <div key={field.name} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={field.name}>{field.label}</Label>
                      {isSet && integration && (
                        <RevealSecretButton
                          integrationId={integration.id}
                          field={field.name}
                        />
                      )}
                    </div>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      autoComplete="off"
                      required={field.required && !isSet}
                      placeholder={
                        isSet ? "•••••• (leave blank to keep)" : field.placeholder
                      }
                    />
                    {field.help && (
                      <p className="text-xs text-ink-tertiary">{field.help}</p>
                    )}
                  </div>
                );
              }

              // text / url
              return (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type={field.kind === "url" ? "url" : "text"}
                    required={field.required}
                    defaultValue={current}
                    placeholder={field.placeholder}
                  />
                  {field.help && (
                    <p className="text-xs text-ink-tertiary">{field.help}</p>
                  )}
                </div>
              );
            })}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="sm:justify-between">
            {integration ? (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={(e) => {
                  const fd = new FormData();
                  fd.set("id", integration.id);
                  fd.set("project_id", projectId);
                  e.preventDefault();
                  void disconnect(fd);
                }}
              >
                Disconnect
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : integration ? "Save changes" : "Connect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
