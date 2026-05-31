import { cookies } from "next/headers";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/constants";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  // When impersonating, subtitle comes from the impersonated user's client.
  // When not impersonating, the real role drives the subtitle.
  const isRealAdmin = profile._impersonating
    ? true // impersonating = real user is admin
    : profile.role === "admin";

  const supabase = await createClient();

  let subtitle = isRealAdmin && !profile._impersonating ? "Admin" : "Client";
  if (profile.role !== "admin" && profile.client_id) {
    const { data } = await supabase
      .from("clients")
      .select("name")
      .eq("id", profile.client_id)
      .single();
    if (data?.name) subtitle = data.name;
  }

  // Projects for the header switcher. Real admins (not impersonating) manage
  // every project, including client-less "internal" ones (e.g. Hello Savvy).
  // Clients — and admins viewing-as a client — only get their own client's
  // projects, so internal projects never appear for them. Impersonation runs
  // RLS as the admin, so we scope by the effective client_id explicitly rather
  // than relying on RLS alone.
  const seesAllProjects = isRealAdmin && !profile._impersonating;
  let projects: { id: string; name: string }[] = [];
  if (seesAllProjects) {
    const { data } = await supabase
      .from("projects")
      .select("id,name")
      .order("name", { ascending: true });
    projects = (data ?? []) as { id: string; name: string }[];
  } else if (profile.client_id) {
    const { data } = await supabase
      .from("projects")
      .select("id,name")
      .eq("client_id", profile.client_id)
      .order("name", { ascending: true });
    projects = (data ?? []) as { id: string; name: string }[];
  }

  // Active project from the cookie the proxy set on the last /projects/[id]
  // visit — validated against the (RLS-scoped) list so a stale id can't leak.
  const cookieStore = await cookies();
  const cookieProjectId = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? null;
  const activeProjectId = projects.some((p) => p.id === cookieProjectId)
    ? cookieProjectId
    : null;

  // Admins need client options for the switcher's "New project" dialog.
  let clientOptions: { id: string; label: string }[] = [];
  if (isRealAdmin && !profile._impersonating) {
    const { data: clientRows } = await supabase
      .from("clients")
      .select("id,name")
      .order("name", { ascending: true });
    clientOptions = (clientRows ?? []).map((c) => ({ id: c.id, label: c.name }));
  }

  return (
    <>
      {profile._impersonating && (
        <ImpersonationBanner
          asEmail={profile.email}
          asName={profile.full_name}
        />
      )}
      <AppShell
        email={profile._impersonating?.adminEmail ?? profile.email}
        subtitle={subtitle}
        year={new Date().getFullYear()}
        isAdmin={isRealAdmin}
        isImpersonating={Boolean(profile._impersonating)}
        projects={projects}
        activeProjectId={activeProjectId}
        clientOptions={clientOptions}
      >
        {children}
      </AppShell>
    </>
  );
}
