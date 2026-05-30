import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? searchParams.get("redirectTo") ?? "/projects";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Always redirect to an absolute path starting with /. The profile will
      // be created by the handle_new_user trigger on first sign-in, so it will
      // exist by the time the destination page loads.
      const safePath =
        next.startsWith("/") && !next.startsWith("//") ? next : "/projects";
      return NextResponse.redirect(`${origin}${safePath}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
