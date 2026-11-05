import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { signInWithGoogle } from "@/app/auth/actions";

export default function LoginPage(props: PageProps<"/login">) {
  return <main className="account-page"><Suspense fallback={<p role="status">Loading sign-in…</p>}>
    <LoginContent searchParams={props.searchParams} />
  </Suspense></main>;
}

async function LoginContent({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const configured = Boolean(getSupabaseConfig());
  if (configured) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/profile");
  }
  return <section className="account-panel">
    <p className="eyebrow">Your seat at the table</p>
    <h1>Come for a laugh.<br />Stay for the company.</h1>
    <p>Sign in with Google to visit the members lounge and make your profile your own.</p>
    {params.error && <p className="form-message" role="alert">
      Sign-in did not complete. Please try again. If it keeps happening, check the Google provider and callback settings.
    </p>}
    {!configured ? <p role="status">Sign-in is not configured yet. Please check back soon.</p> :
      <form action={signInWithGoogle}><button className="button" type="submit">Continue with Google</button></form>}
    <Link href="/">← Browse the public joke collection</Link>
  </section>;
}
