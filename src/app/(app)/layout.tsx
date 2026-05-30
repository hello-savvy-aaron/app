import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

// Shared, role-gated app shell. Both admins and users get the same chrome
// (collapsible sidebar + header + footer + account menu); page content branches
// on role.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  let subtitle = "Admin";
  if (profile.role !== "admin") {
    subtitle = "Client";
    if (profile.client_id) {
      const supabase = await createClient();
      const { data } = await supabase
        .from("clients")
        .select("name")
        .eq("id", profile.client_id)
        .single();
      if (data?.name) subtitle = data.name;
    }
  }

  return (
    <AppShell
      email={profile.email}
      subtitle={subtitle}
      year={new Date().getFullYear()}
    >
      {children}
    </AppShell>
  );
}
