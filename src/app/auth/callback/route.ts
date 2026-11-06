import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { RETURN_COOKIE, safeReturnPath } from "@/lib/navigation";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const returnTo = safeReturnPath(cookieStore.get(RETURN_COOKIE)?.value);
  const code = request.nextUrl.searchParams.get("code");
  if (code && getSupabaseConfig()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      cookieStore.delete(RETURN_COOKIE);
      const response = NextResponse.redirect(new URL(returnTo, request.url));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }
  const target = new URL("/login", request.url);
  target.searchParams.set("error", "callback");
  target.searchParams.set("returnTo", returnTo);
  const response = NextResponse.redirect(target);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
