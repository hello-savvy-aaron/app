import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/constants";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  // Remember the last project the user opened so the header switcher (and Blog
  // Studio) keep it in context on routes that carry no project id in the URL.
  // Skip redirects (e.g. the unauthenticated → /login bounce).
  const match = request.nextUrl.pathname.match(/^\/projects\/([^/]+)/);
  if (match && response.status < 300) {
    response.cookies.set(ACTIVE_PROJECT_COOKIE, match[1], {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
