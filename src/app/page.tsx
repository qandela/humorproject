import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getDailyBrief, isUuid, TOPICS, type Caption } from "@/lib/captions";
import { VoteForm } from "@/components/vote-form";
import { ShareCaption } from "@/components/share-caption";
import styles from "./page.module.css";

export default function Home(props: PageProps<"/">) {
  return <main className={styles.main}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>The Humor Project / Campus to city</p>
      <h1>New York moments.<br />Group chat energy.</h1>
      <p className={styles.intro}>AI writes the caption. You decide if it lands.</p>
      <Link href="/create" className="button">Make a caption →</Link>
    </header>
    <Suspense fallback={<p className={styles.notice} role="status">Opening today’s scene…</p>}><DailyBrief /></Suspense>
    <section aria-label="AI caption feed" className="caption-section">
      <Suspense fallback={<p className={styles.notice} role="status">Loading captions…</p>}><CaptionFeed searchParams={props.searchParams} /></Suspense>
    </section>
    <footer className={styles.footer}>Made for the moments between classes. <Link href="/jokes">Browse the classic joke collection →</Link></footer>
  </main>;
}

async function DailyBrief() {
  await connection();
  const brief = getDailyBrief();
  return <aside className="daily-brief">
    <div><p className="eyebrow">Today’s scene / {brief.date}</p><h2>{brief.title}</h2><p>{brief.scene}</p></div>
    <Link className="button secondary" href="/create">Caption this →</Link>
  </aside>;
}

async function CaptionFeed({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  await connection();
  const params = await searchParams;
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
    const query = new URLSearchParams({ sort: nextSort, topic: nextTopic });
    return `/?${query}`;
  }
  return <>
    {params.created === "1" && rows.length > 0 && <p className="form-message" role="status">Your caption is live. Copy its link and let the group chat weigh in.</p>}
    <div className={styles.collectionHeading}><h2>{captionId ? "The caption" : "The caption feed"}</h2><span>AI generated · Community rated</span></div>
    {captionId ? <Link href="/">← Back to the feed</Link> : <>
      <nav className="feed-tabs" aria-label="Sort captions">
        {[["new", "New"], ["today", "Today’s best"], ["top", "Top all time"]].map(([value, label]) =>
          <Link key={value} href={filterUrl(value, topic)} aria-current={sort === value ? "page" : undefined}>{label}</Link>)}
      </nav>
      <nav className="topic-tabs" aria-label="Filter captions by topic">
        {["all", ...TOPICS].map(value => <Link key={value} href={filterUrl(sort, value)} aria-current={topic === value ? "page" : undefined}>{value === "all" ? "All moments" : value}</Link>)}
      </nav>
    </>}
    {failed ? <p className={styles.notice} role="status">The caption feed could not load. Please try again shortly.</p> : rows.length === 0 ?
      <div className={styles.notice}><h3>{captionId ? "This caption is no longer available." : "Your group chat’s next favorite starts here."}</h3><p>{captionId ? "Head back to the feed to find another laugh." : "No captions in this view yet. Take today’s scene for a spin or bring your own."}</p><Link className="button" href="/create">Create a caption →</Link></div> :
      <ul className="caption-grid">{rows.map(caption => <li key={caption.id} className="caption-card" id={`caption-${caption.id}`}>
        <div className="caption-meta"><span className={styles.category}>{caption.topic}</span><span>{caption.tone} · AI</span></div>
        <p className="caption-scene">{caption.scene}</p>
        <h3>{caption.content}</h3>
        <div className="caption-stats"><span>{caption.score > 0 ? "+" : ""}{caption.score} score · {caption.vote_count} {caption.vote_count === 1 ? "vote" : "votes"}</span><time dateTime={caption.created_at}>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }).format(new Date(caption.created_at))}</time></div>
        {signedIn ? <VoteForm captionId={caption.id} initialVote={caption.my_vote} /> : <Link className="signin-vote" href="/login">Sign in to rate this caption →</Link>}
        <div className="caption-share"><Link href={`/?caption=${caption.id}`}>Open caption</Link><ShareCaption id={caption.id} /></div>
        {caption.prompt && <details className="saved-prompt"><summary>Your saved generation prompt</summary><pre>{caption.prompt}</pre></details>}
      </li>)}</ul>}
    <p className="field-help feed-note">One vote per account per caption. Scores are Funny votes minus Pass votes.</p>
  </>;
}
