import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { signOut } from "@/app/auth/actions";
import { NavLink } from "@/components/nav-link";

export async function AccountNav() {
  let signedIn = false;
  if (getSupabaseConfig()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  }
  return (
    <nav className="account-nav" aria-label="Main navigation">
      <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true">c.</span><span>Campus to City<small>The Humor Project</small></span></Link>
      <div className="nav-links">
        <NavLink href="/">The feed</NavLink>
        <NavLink href="/create">Create</NavLink>
        {signedIn ? <>
          <NavLink href="/my-captions">My captions</NavLink>
          <NavLink href="/profile">Profile</NavLink>
          <form action={signOut}><button className="button secondary" type="submit">Sign out</button></form>
        </> : <Link className="button" href="/login">Sign in</Link>}
      </div>
    </nav>
  );
}
