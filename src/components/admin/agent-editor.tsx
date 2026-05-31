"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateAgent } from "@/lib/agent-actions";
import { AGENT_MODELS } from "@/lib/agents/models";
import type { Agent, ToolCatalogItem } from "@/lib/types";

// Full configuration form for an agent, rendered inline on the detail page.
// Tool checkboxes post multiple `enabled_tools` values; the action keeps only
// names that still exist in the registry.
export function AgentEditor({
  agent,
  tools,
}: {
  agent: Agent;
  tools: ToolCatalogItem[];
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  async function action(formData: FormData) {
    setBusy(true);
    setStatus(null);
    try {
      await updateAgent(formData);
      setStatus({ type: "ok", text: "Saved." });
    } catch (e) {
      setStatus({
        type: "error",
        text: e instanceof Error ? e.message : "Save failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={agent.id} />
      <input type="hidden" name="project_id" value={agent.project_id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required defaultValue={agent.name} />
        </div>
        <div className="space-y-2">
          <Label>Model</Label>
          <Select name="model" defaultValue={agent.model}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGENT_MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          defaultValue={agent.description ?? ""}
          placeholder="What this agent does"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="system_prompt">System prompt</Label>
        <Textarea
          id="system_prompt"
          name="system_prompt"
          rows={8}
          defaultValue={agent.system_prompt}
          className="font-mono text-xs"
          placeholder="You are a helpful assistant for this project…"
        />
      </div>

      <div className="space-y-2">
        <Label>Tools</Label>
        <p className="text-xs text-ink-tertiary">
          Tools the agent may call. Everything runs scoped to this agent&apos;s
          project.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {tools.map((t) => (
            <label
              key={t.name}
              className="flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-sm"
            >
              <input
                type="checkbox"
                name="enabled_tools"
                value={t.name}
                defaultChecked={agent.enabled_tools.includes(t.name)}
                className="mt-1 size-4 shrink-0 accent-brand-primary"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-medium">
                  {t.label}
                  {t.mutating && (
                    <Badge className="border-transparent bg-pink-100 text-pink-500 ring-1 ring-pink-500/30">
                      writes
                    </Badge>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-ink-tertiary">
                  {t.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="max_steps">Max steps</Label>
          <Input
            id="max_steps"
            name="max_steps"
            type="number"
            min={1}
            max={30}
            defaultValue={agent.max_steps}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_tokens">Max tokens / step</Label>
          <Input
            id="max_tokens"
            name="max_tokens"
            type="number"
            min={256}
            max={16384}
            step={256}
            defaultValue={agent.max_tokens}
          />
        </div>
        <div className="space-y-2">
          <Label>Enabled</Label>
          <label className="flex h-9 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="enabled"
              value="true"
              defaultChecked={agent.enabled}
              className="size-4 accent-brand-primary"
            />
            Can be run
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
        {status && (
          <span
            className={
              status.type === "ok"
                ? "text-sm text-[#2f6f4f]"
                : "text-sm text-destructive"
            }
          >
            {status.text}
          </span>
        )}
      </div>
    </form>
  );
}
