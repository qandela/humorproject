"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function signInWithGoogle() {
  if (!getSupabaseConfig()) redirect("/login?error=configuration");
  // Next.js Server Actions validate the Origin against the request host.
  const origin = (await headers()).get("origin");
  if (!origin) redirect("/login?error=signin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: new URL("/auth/callback", origin).toString(),
      skipBrowserRedirect: true,
    },
  });
  if (error || !data.url) redirect("/login?error=signin");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) redirect("/profile?error=signout");
  revalidatePath("/", "layout");
  redirect("/login");
}
