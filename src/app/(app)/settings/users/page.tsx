import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { startImpersonation } from "@/lib/impersonation-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/eyebrow";
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
    .order("created_at", { ascending: false });
  const people = (profileRows ?? []) as Profile[];

  const { data: clientRows } = await supabase.from("clients").select("*");
  const clientName = new Map(
    (clientRows ?? [] as Client[]).map((c) => [c.id, c.name]),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Eyebrow className="mb-2">People</Eyebrow>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Users</h1>
        <p className="text-sm text-ink-secondary">
          {people.length} {people.length === 1 ? "person" : "people"} ·{" "}
          <span className="text-ink-tertiary">
            &ldquo;View as&rdquo; shows the app as that client sees it. Admins
            can&rsquo;t be impersonated.
          </span>
        </p>
      </div>

      {people.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-ink-secondary">
          No one here yet. People appear once they sign up.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <p className="font-medium">
                      {u.full_name ?? <span className="text-ink-tertiary">—</span>}
                    </p>
                    <p className="text-xs text-ink-secondary">{u.email}</p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.role === "admin" ? "secondary" : "outline"}
                      className="capitalize"
                    >
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-ink-secondary">
                    {u.client_id ? clientName.get(u.client_id) ?? "—" : "—"}
                  </TableCell>
                  <TableCell className="text-ink-secondary">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.role === "admin" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        title="Admins can't be impersonated"
                      >
                        View as
                      </Button>
                    ) : (
                      <form action={startImpersonation}>
                        <input type="hidden" name="profile_id" value={u.id} />
                        <Button type="submit" variant="outline" size="sm">
                          View as
                        </Button>
                      </form>
                    )}
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
