import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ShareCaption } from "@/components/share-caption";
import { RefreshButton } from "@/components/refresh-button";
import type { CaptionInput } from "@/lib/captions";

type Request = CaptionInput & { id: string; status: string; created_at: string };
type SavedCaption = { id: string; request_id: string; content: string };

export default function MyCaptionsPage() {
  return <main className="library-page"><Suspense fallback={<p className="notice-panel" role="status">Opening your collection…</p>}><MyCaptions /></Suspense></main>;
}

async function MyCaptions() {
  const { supabase, user } = await requireUser("/my-captions");
  const { data, error } = await supabase.from("generation_requests").select("id,scene,topic,tone,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  const requests = (data ?? []) as Request[];
  const { data: captions, error: captionError } = requests.length ? await supabase.from("captions").select("id,request_id,content").in("request_id", requests.map(row => row.id)) : { data: [], error: null };
  const saved = new Map(((captions ?? []) as SavedCaption[]).map(caption => [caption.request_id, caption]));
  return <>
    <header className="library-header"><div><p className="eyebrow">Your corner of the internet</p><h1>Good lines.<br />Worth keeping.</h1><p>Your recent captions and scenes, ready for the next group chat.</p></div><Link className="button" href="/create">Make a caption ↗</Link></header>
    {error || captionError ? <div className="notice-panel" role="status"><h2>Your collection couldn’t load.</h2><p>Your saved work is still in your account. Give it another try.</p><RefreshButton /></div> : !requests.length ?
      <div className="empty-collection"><span aria-hidden="true">✦</span><h2>Your collection starts with one scene.</h2><p>Pick a campus moment or something wonderfully specific. Your published captions will be saved here.</p><Link className="button" href="/create">Create your first caption →</Link></div> : <>
        <div className="library-count"><span>{saved.size} published <span aria-hidden="true">·</span> {requests.length} recent {requests.length === 1 ? "attempt" : "attempts"}</span><RefreshButton label="Refresh collection" /></div>
        <ul className="caption-grid">{requests.map(request => {
          const caption = saved.get(request.id);
          return <li className="caption-card library-card" key={request.id}>
            <div className="caption-meta"><span className="topic-badge">{request.topic}</span><span className={`status-badge ${caption ? "published" : ""}`}>{caption ? "Published" : request.status === "failed" ? "Didn’t finish" : "Not published"}</span></div>
            <div className="scene-context"><span className="mini-label">Your scene</span><p>{request.scene}</p></div>
            {caption ? <><h2 className="caption-text">{caption.content}</h2><Link className="library-open" href={`/?caption=${caption.id}`}>View caption & votes →</Link><ShareCaption id={caption.id} content={caption.content} /></> : <p className="field-help">This attempt didn’t publish a caption. You can reuse the scene and try again when you have an available attempt.</p>}
            <div className="caption-share"><Link href={`/create?request=${request.id}`}>↻ Reuse this scene</Link><time dateTime={request.created_at}>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }).format(new Date(request.created_at))}</time></div>
          </li>;
        })}</ul><p className="field-help feed-note">Showing your latest 50 attempts. Only you can access this collection.</p>
      </>}
  </>;
}
