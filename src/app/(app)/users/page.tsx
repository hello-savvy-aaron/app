import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { startImpersonation } from "@/lib/impersonation-actions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Profile, Client } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: profileRows } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "user")
    .order("created_at", { ascending: false });
  const users = (profileRows ?? []) as Profile[];

  const { data: clientRows } = await supabase.from("clients").select("*");
  const clientName = new Map(
    (clientRows ?? [] as Client[]).map((c) => [c.id, c.name]),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Users</h1>
        <p className="text-sm text-ink-secondary">
          {users.length} user{users.length === 1 ? "" : "s"} ·{" "}
          <span className="text-ink-tertiary">
            Click "View as" to see the app exactly as that user sees it.
          </span>
        </p>
      </div>

      {users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-ink-secondary">
          No users yet. They'll appear here once someone signs up.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / Email</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <p className="font-medium">
                      {u.full_name ?? <span className="text-ink-tertiary">—</span>}
                    </p>
                    <p className="text-xs text-ink-secondary">{u.email}</p>
                  </TableCell>
                  <TableCell className="text-ink-secondary">
                    {u.client_id ? clientName.get(u.client_id) ?? "—" : "—"}
                  </TableCell>
                  <TableCell className="text-ink-secondary">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={startImpersonation}>
                      <input type="hidden" name="profile_id" value={u.id} />
                      <Button type="submit" variant="outline" size="sm">
                        View as
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
