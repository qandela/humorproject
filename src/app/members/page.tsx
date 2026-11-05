import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default function MembersPage() {
  return <main className="account-page"><Suspense fallback={<p role="status">Checking your membership…</p>}>
    <MembersContent />
  </Suspense></main>;
}

async function MembersContent() {
  const { user } = await requireUser();
  return <section className="account-panel">
    <p className="eyebrow">Members only</p>
    <h1>You’re in good company.</h1>
    <p>Welcome to the lounge. This space is only available after signing in.</p>
    <p className="form-message">Signed in as {user.email ?? "a Humor Project member"}.</p>
    <h2>Bring something to the group chat.</h2>
    <p>Turn a campus moment into an AI caption, then see what the community thinks.</p>
    <Link className="button" href="/create">Create a caption →</Link>
    <Link href="/profile">Edit your profile</Link>
  </section>;
}
