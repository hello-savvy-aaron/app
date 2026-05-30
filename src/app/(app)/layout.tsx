import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { Wordmark } from "@/components/wordmark";

// Shared, role-gated app shell. Both admins and users get the same left-nav
// shell; page content branches on role.
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
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <div className="mb-6">
          <Wordmark className="text-lg" />
          <p className="mt-0.5 truncate text-xs font-medium tracking-[0.08em] text-ink-tertiary uppercase">
            {subtitle}
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 text-sm">
          <Link
            href="/projects"
            className="rounded-full px-3 py-2 font-medium text-ink-secondary transition-colors hover:bg-brand-primary-soft hover:text-brand-deep"
          >
            Projects
          </Link>
        </nav>
        <div className="mt-auto border-t border-sidebar-border pt-3">
          <p className="truncate px-3 pb-1 text-xs text-ink-tertiary">
            {profile.email}
          </p>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden p-6 md:p-8">{children}</main>
    </div>
  );
}
