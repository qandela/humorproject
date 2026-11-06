"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="account-page"><section className="account-panel"><p className="eyebrow">A small plot twist</p><h1>This page needs<br />another take.</h1><p>Something interrupted the request. Give it another try, or head back to the feed.</p><button className="button" onClick={reset}>Try again</button><Link href="/">Back to the feed →</Link></section></main>;
}
