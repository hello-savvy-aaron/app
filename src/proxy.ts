import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/constants";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  // Remember the last project the user opened so the header switcher (and Blog
  // Studio) keep it in context on routes that carry no project id in the URL.
  // Skip redirects (e.g. the unauthenticated → /login bounce).
  const match = request.nextUrl.pathname.match(/^\/projects\/([^/]+)/);
  // Skip prefetch requests: Next prefetches every project link (e.g. as soon as
  // the switcher opens), which would otherwise overwrite the cookie with the
  // last-prefetched project instead of the one the user actually opened.
  const isPrefetch =
    request.headers.get("next-router-prefetch") !== null ||
    request.headers.get("purpose") === "prefetch";
  if (match && response.status < 300 && !isPrefetch) {
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
