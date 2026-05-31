"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { IMPERSONATE_COOKIE } from "@/lib/constants";

export async function startImpersonation(formData: FormData) {
  await requireAdmin();
  const profileId = (formData.get("profile_id") as string | null)?.trim();
  if (!profileId) return;

  // Verify the target profile exists and is not an admin (no impersonating admins).
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", profileId)
    .single();
  if (!data || data.role === "admin") return;

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_COOKIE, profileId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });
  redirect("/projects");
}

export async function stopImpersonation() {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATE_COOKIE);
  redirect("/users");
}
