import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const isAdmin = profile.role === "admin" && !profile._impersonating;

  // Land on the first accessible project (RLS scopes this per role). Most
  // clients have exactly one.
  const { data: first } = await supabase
    .from("projects")
    .select("id")
    .order("name", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (first?.id) redirect(`/projects/${first.id}`);

  // No project: admins manage from internal docs; clients see a waiting state.
  if (isAdmin) redirect("/documents");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="max-w-md rounded-xl border border-dashed border-foreground/15 p-10 text-center">
        <h1 className="text-xl font-bold tracking-[-0.02em]">No project yet</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          We&apos;ll set up your project shortly. It will appear here once it
          kicks off.
        </p>
      </div>
    </main>
  );
}
