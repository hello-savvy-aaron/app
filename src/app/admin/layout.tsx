import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 p-4 md:flex">
        <div className="mb-6">
          <p className="text-lg font-semibold">Hello Savvy</p>
          <p className="text-xs text-muted-foreground">Admin</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 text-sm">
          <Link
            href="/admin"
            className="rounded-md px-3 py-2 font-medium hover:bg-accent"
          >
            Projects
          </Link>
        </nav>
        <div className="mt-auto border-t pt-3">
          <p className="truncate px-3 pb-1 text-xs text-muted-foreground">
            {profile.email}
          </p>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden p-6 md:p-8">{children}</main>
    </div>
  );
}
