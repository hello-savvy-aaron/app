import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/eyebrow";
import { ProjectTabs } from "@/components/project-tabs";
import { IntegrationCard } from "@/components/admin/integration-card";
import { INTEGRATIONS } from "@/lib/integrations/registry";
import type { ProjectIntegration } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectIntegrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Admin-only: per-project external credentials. RLS enforces it on every row.
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id,name")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();
  const p = project as { id: string; name: string };

  const { data: rows } = await supabase
    .from("project_integrations")
    .select("*")
    .eq("project_id", p.id);
  const integrations = (rows ?? []) as ProjectIntegration[];
  const byProvider = new Map(integrations.map((i) => [i.provider, i]));

  // Which secret fields are set, per integration (presence = set).
  const setFields = new Map<string, Set<string>>(); // integration id -> field names
  if (integrations.length > 0) {
    const { data: secretRows } = await supabase
      .from("project_integration_secrets")
      .select("integration_id, field")
      .in(
        "integration_id",
        integrations.map((i) => i.id),
      );
    for (const r of secretRows ?? []) {
      const set = setFields.get(r.integration_id as string) ?? new Set<string>();
      set.add(r.field as string);
      setFields.set(r.integration_id as string, set);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 space-y-2">
        <Eyebrow>Project</Eyebrow>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">{p.name}</h1>
      </div>

      <ProjectTabs projectId={p.id} active="integrations" />

      <div className="mt-6 mb-6">
        <h2 className="text-lg font-bold tracking-[-0.01em]">Integrations</h2>
        <p className="text-sm text-ink-secondary">
          Connect this project&apos;s own API keys and credentials. Stored
          encrypted; they override the global defaults at runtime.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {INTEGRATIONS.map((def) => {
          const integration = byProvider.get(def.provider) ?? null;
          const fields = integration
            ? Array.from(setFields.get(integration.id) ?? [])
            : [];
          return (
            <IntegrationCard
              key={def.provider}
              projectId={p.id}
              provider={def.provider}
              integration={integration}
              setSecretFields={fields}
            />
          );
        })}
      </div>
    </div>
  );
}
