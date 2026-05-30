import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Returns the signed-in user's profile, or null if not signed in.
 *  If the auth session exists but the profile row is missing (e.g. the
 *  handle_new_user trigger didn't fire for an API-created user), this
 *  creates the profile on the fly so the session is never in a broken state. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (data) return data as Profile;

  // Profile missing — upsert it now so the user isn't stuck in a loop.
  const isAdmin = user.email
    ? user.email.endsWith("@hellosavvy.design")
    : false;
  const display =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email ||
    "";

  const { data: created } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      email: user.email ?? "",
      full_name: display || null,
      role: isAdmin ? "admin" : "user",
      client_id: null,
    })
    .select("*")
    .single();

  return (created as Profile) ?? null;
}

/** Require a signed-in profile; redirect to /login if absent. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** Require an admin profile; redirect non-admins to the projects view. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/projects");
  return profile;
}
