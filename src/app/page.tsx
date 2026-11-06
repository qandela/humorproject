import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getDailyBrief, isUuid, TOPICS, type Caption } from "@/lib/captions";
import { CaptionCard } from "@/components/caption-card";
import { RefreshButton } from "@/components/refresh-button";
import styles from "./page.module.css";

type Query = Awaited<PageProps<"/">["searchParams"]>;

export default function Home(props: PageProps<"/">) {
  return <main className={styles.main}><Suspense fallback={<p className="notice-panel" role="status">Finding the good lines…</p>}><HomeContent searchParams={props.searchParams} /></Suspense></main>;
}

async function HomeContent({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const params = await searchParams;
  const detail = isUuid(params.caption);
  return <>
    {detail ? <header className="detail-header"><Link href="/">← Back to the feed</Link><p className="eyebrow">One moment. A lot of opinions.</p><h1>Does this one land?</h1></header> :
      <section className="hero-grid">
        <header className={styles.header}>
          <span className="hero-kicker"><span aria-hidden="true">✦</span> For the moments between classes</span>
          <h1>New York moments.<br /><em>Group chat energy.</em></h1>
          <p className={styles.intro}>Campus detours. Dorm-room lore. City-life plot twists.<br />AI writes the caption. You decide if it lands.</p>
          <div className="hero-actions"><Link href="/create" className="button">Make a caption ↗</Link><a className="quiet-link" href="#feed">Find your next favorite ↓</a></div>
          <p className="hero-footnote">A new scene every day. A good line whenever you need one.</p>
        </header>
        <Suspense fallback={<div className="daily-brief" role="status">Setting today’s scene…</div>}><DailyBrief /></Suspense>
      </section>}
    <section id="feed" aria-label="AI caption feed" className="caption-section">
      <Suspense fallback={<div className="feed-skeleton" role="status">Loading the latest captions…</div>}><CaptionFeed params={params} /></Suspense>
    </section>
    <footer className={styles.footer}><span>Campus to City <span aria-hidden="true">/</span> The Humor Project</span><Link href="/jokes">The classic joke collection ↗</Link></footer>
  </>;
}

async function DailyBrief() {
  await connection();
  const brief = getDailyBrief();
  return <aside className="daily-brief">
    <div className="brief-top"><p className="eyebrow">The daily prompt</p><span>{brief.date}</span></div>
    <span className="brief-star" aria-hidden="true">✳</span>
    <h2>{brief.title}</h2><p className="brief-scene">{brief.scene}</p>
    <div className="brief-bottom"><span>{brief.topic}</span><Link href="/create">Caption this <span aria-hidden="true">↗</span></Link></div>
  </aside>;
}

async function CaptionFeed({ params }: { params: Query }) {
  await connection();
  const sort = ["top", "today"].includes(String(params.sort)) ? String(params.sort) : "new";
  const topic = TOPICS.includes(params.topic as typeof TOPICS[number]) ? String(params.topic) : "all";
  const captionId = isUuid(params.caption) ? params.caption : null;
  const settings = getSupabaseConfig();
  let rows: Caption[] = [];
  let signedIn = false;
  let failed = !settings;
  if (settings) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    signedIn = Boolean(user);
    const { data, error } = await supabase.rpc("get_caption_feed", { p_sort: sort, p_topic: topic, p_caption_id: captionId });
    failed = Boolean(error);
    rows = error ? [] : (data ?? []) as Caption[];
  }
  function filterUrl(nextSort: string, nextTopic: string) {
    return `/?${new URLSearchParams({ sort: nextSort, topic: nextTopic })}#feed`;
  }
  return <>
    {params.created === "1" && signedIn && rows[0]?.prompt && <div className="published-banner" role="status"><span aria-hidden="true">✓</span><div><strong>Your caption is live.</strong><p>Copy it for the group chat, or share the link and let people vote.</p></div><Link href="/my-captions">My captions →</Link></div>}
    {!captionId && <><div className={styles.collectionHeading}><div><p className="eyebrow">Made by AI. Judged by humans.</p><h2>What’s landing?</h2></div><span>{!failed && rows.length ? `${rows.length} captions in this view` : "Find a line worth sharing"}</span></div>
      <div className="feed-toolbar"><nav className="feed-tabs" aria-label="Sort captions">
        {[["new", "Latest"], ["today", "Today’s best"], ["top", "All-time favorites"]].map(([value, label]) =>
          <Link key={value} href={filterUrl(value, topic)} aria-current={sort === value ? "page" : undefined}>{label}</Link>)}
      </nav><span className="sort-explainer">{sort === "new" ? "Fresh from the studio" : sort === "today" ? "Highest scores since midnight in NYC" : "Highest community scores"}</span></div>
      <nav className="topic-tabs" aria-label="Filter captions by topic">
        {["all", ...TOPICS].map(value => <Link key={value} href={filterUrl(sort, value)} aria-current={topic === value ? "page" : undefined}>{value === "all" ? "All moments" : value}</Link>)}
      </nav>
    </>}
    {failed ? <div className="notice-panel" role="status"><h2>The feed hit a little detour.</h2><p>We couldn’t load the captions. Give it another try in a moment.</p><RefreshButton /></div> : rows.length === 0 ?
      <div className="empty-collection"><span aria-hidden="true">✦</span><h2>{captionId ? "This caption is off the map." : sort === "today" ? "A fresh day. A clean slate." : "Your group chat’s next favorite starts here."}</h2><p>{captionId ? "It may no longer be available. There are more moments to discover in the feed." : "No captions in this view yet. Try another topic or put your own scene into words."}</p><div className="empty-actions"><Link className="button" href={captionId ? "/" : "/create"}>{captionId ? "Explore the feed →" : "Create a caption ↗"}</Link>{!captionId && (sort !== "new" || topic !== "all") && <Link href="/#feed">Clear filters</Link>}</div></div> :
      <ul className={`caption-grid ${captionId ? "caption-detail" : ""}`}>{rows.map(caption => <CaptionCard key={caption.id} caption={caption} signedIn={signedIn} />)}</ul>}
    {rows.length > 0 && <p className="field-help feed-note">Funny adds 1. Not quite subtracts 1. One final vote per account, per caption.</p>}
  </>;
}
