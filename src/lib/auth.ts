import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { loginPath } from "@/lib/navigation";

export async function requireUser(returnTo = "/profile") {
  if (!getSupabaseConfig()) redirect(loginPath(returnTo));
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect(loginPath(returnTo));
  return { supabase, user };
}
