import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { signOut } from "@/app/auth/actions";

export async function AccountNav() {
  let signedIn = false;
  if (getSupabaseConfig()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  }
  return (
    <nav className="account-nav" aria-label="Main navigation">
      <Link className="brand" href="/">The Humor Project</Link>
      <div className="nav-links">
        <Link href="/">Jokes</Link>
        <Link href="/members">Members lounge</Link>
        {signedIn ? <>
          <Link href="/profile">Profile</Link>
          <form action={signOut}><button className="button secondary" type="submit">Sign out</button></form>
        </> : <Link className="button" href="/login">Sign in</Link>}
      </div>
    </nav>
  );
}
