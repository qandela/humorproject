import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { safeReturnPath } from "@/lib/navigation";
import { signInWithGoogle } from "@/app/auth/actions";

export default function LoginPage(props: PageProps<"/login">) {
  return <main className="account-page"><Suspense fallback={<p role="status">Loading sign-in…</p>}>
    <LoginContent searchParams={props.searchParams} />
  </Suspense></main>;
}

async function LoginContent({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const returnTo = safeReturnPath(params.returnTo);
  const configured = Boolean(getSupabaseConfig());
  if (configured) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect(returnTo);
  }
  return <section className="account-panel login-panel">
    <span className="section-number" aria-hidden="true">↗</span>
    <p className="eyebrow">A little more than a spectator</p>
    <h1>Your next good<br />caption starts here.</h1>
    <p>Make a caption, vote on what lands, and keep your creations in one place.</p>
    {params.error && <p className="form-message" role="alert">
      We couldn’t finish signing you in. Try again from this page.
    </p>}
    {!configured ? <p role="status">Sign-in is not available yet. Please check back soon.</p> :
      <form action={signInWithGoogle}>
        <input type="hidden" name="return_to" value={returnTo} />
        <button className="button google-button" type="submit"><span aria-hidden="true">G</span> Continue with Google</button>
      </form>}
    <p className="field-help">We’ll bring you back to where you left off.</p>
    <Link href="/">← Keep browsing the public feed</Link>
  </section>;
}
