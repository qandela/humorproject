import Link from "next/link";

export default function NotFound() {
  return <main className="account-page"><section className="account-panel"><p className="eyebrow">404 / Off the map</p><h1>Wrong stop.<br />Good stories ahead.</h1><p>This page doesn’t exist. The feed has plenty of other places to go.</p><Link className="button" href="/">Back to the feed →</Link></section></main>;
}
