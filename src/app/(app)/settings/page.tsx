import { requireProfile } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/eyebrow";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await requireProfile();

  return (
    <div className="mx-auto max-w-2xl">
      <Eyebrow className="mb-2">Account</Eyebrow>
      <h1 className="mb-6 text-2xl font-bold tracking-[-0.02em]">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Your Hello Savvy account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-ink-tertiary">Email</p>
            <p className="font-medium">{profile.email}</p>
          </div>
          {profile.full_name && (
            <div>
              <p className="text-ink-tertiary">Name</p>
              <p className="font-medium">{profile.full_name}</p>
            </div>
          )}
          <div>
            <p className="text-ink-tertiary">Role</p>
            <p className="font-medium capitalize">{profile.role}</p>
          </div>
          <form
            action="/auth/signout"
            method="post"
            className="border-t border-border pt-4"
          >
            <Button type="submit" variant="secondary">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
