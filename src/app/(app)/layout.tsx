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

  let subtitle = isRealAdmin && !profile._impersonating ? "Admin" : "Client";
  if (profile.role !== "admin" && profile.client_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("clients")
      .select("name")
      .eq("id", profile.client_id)
      .single();
    if (data?.name) subtitle = data.name;
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
      >
        {children}
      </AppShell>
    </>
  );
}
