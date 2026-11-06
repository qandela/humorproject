import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { loginPath } from "@/lib/navigation";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const settings = getSupabaseConfig();
  const protectedRoute = request.nextUrl.pathname === "/profile" ||
    request.nextUrl.pathname.startsWith("/profile/") ||
    request.nextUrl.pathname === "/members" ||
    request.nextUrl.pathname.startsWith("/members/") ||
    request.nextUrl.pathname === "/create" ||
    request.nextUrl.pathname.startsWith("/create/") ||
    request.nextUrl.pathname === "/my-captions" ||
    request.nextUrl.pathname.startsWith("/my-captions/");
  const loginUrl = new URL(loginPath(request.nextUrl.pathname + request.nextUrl.search), request.url);

  if (!settings) {
    return protectedRoute
      ? NextResponse.redirect(loginUrl)
      : response;
  }

  const supabase = createServerClient(settings.url, settings.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });

  // getUser validates the session with Supabase; cookie contents alone are not trusted.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) response.headers.set("Cache-Control", "private, no-store");
  if (protectedRoute) {
    response.headers.set("Cache-Control", "private, no-store");
    if (!user) {
      const redirect = NextResponse.redirect(loginUrl);
      response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
      redirect.headers.set("Cache-Control", "private, no-store");
      return redirect;
    }
  }
  return response;
}

export const config = {
  matcher: ["/", "/jokes", "/login", "/members/:path*", "/profile/:path*", "/create/:path*", "/my-captions/:path*"],
};
