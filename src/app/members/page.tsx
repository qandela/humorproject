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
    <h2>A little insider humor</h2>
    <p>Why did the developer bring a ladder to work? To reach the next level.</p>
    <Link className="button" href="/profile">Make yourself at home →</Link>
  </section>;
}
