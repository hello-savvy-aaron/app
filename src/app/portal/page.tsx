import { requireProfile } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function PortalPage() {
  const profile = await requireProfile();
  const name = profile.full_name?.split(" ")[0] ?? null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">
            Welcome{name ? `, ${name}` : ""}
          </CardTitle>
          <CardDescription>
            You&apos;re signed in to your Hello Savvy client portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Signed in as</p>
            <p className="font-medium">{profile.email}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Your projects and updates will appear here soon. We&apos;ll let you
            know when there&apos;s something new.
          </p>
          <div className="border-t pt-3">
            <SignOutButton />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
