import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { ImpersonationBanner } from "@/components/impersonation-banner";

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

  // Projects for the header switcher — RLS scopes these per role (admins see
  // all, users see only their client's).
  const { data: projectRows } = await supabase
    .from("projects")
    .select("id,name")
    .order("name", { ascending: true });
  const projects = (projectRows ?? []) as { id: string; name: string }[];

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
          adminEmail={profile._impersonating.adminEmail}
        />
      )}
      <AppShell
        email={profile._impersonating?.adminEmail ?? profile.email}
        subtitle={subtitle}
        year={new Date().getFullYear()}
        isAdmin={isRealAdmin}
        isImpersonating={Boolean(profile._impersonating)}
        projects={projects}
        clientOptions={clientOptions}
      >
        {children}
      </AppShell>
    </>
  );
}
