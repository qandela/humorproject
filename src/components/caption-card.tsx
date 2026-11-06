import Link from "next/link";
import { VoteForm } from "@/components/vote-form";
import { ShareCaption } from "@/components/share-caption";
import { loginPath } from "@/lib/navigation";
import type { Caption } from "@/lib/captions";

export function CaptionCard({ caption, signedIn }: { caption: Caption; signedIn: boolean }) {
  return <li className="caption-card" data-topic={caption.topic} id={`caption-${caption.id}`}>
    <div className="caption-meta"><span className="topic-badge">{caption.topic}</span><span>{caption.tone} <span aria-hidden="true">·</span> AI generated</span></div>
    <div className="scene-context"><span className="mini-label">The scene</span><p>{caption.scene}</p></div>
    <h3 className="caption-text">{caption.content}</h3>
    <div className="caption-stats"><span><strong>{caption.score > 0 ? "+" : ""}{caption.score}</strong> score <span aria-hidden="true">·</span> {caption.vote_count} {caption.vote_count === 1 ? "vote" : "votes"}</span><time dateTime={caption.created_at}>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }).format(new Date(caption.created_at))}</time></div>
    {signedIn ? <VoteForm captionId={caption.id} initialVote={caption.my_vote} /> : <Link className="signin-vote" href={loginPath(`/?caption=${caption.id}`)}>Sign in to vote on this caption →</Link>}
    <div className="caption-share"><Link className="remix-link" href={`/create?remix=${caption.id}`}>↻ Remix this scene</Link><ShareCaption id={caption.id} content={caption.content} /></div>
    {caption.prompt && <details className="saved-prompt"><summary>Your saved generation prompt</summary><pre>{caption.prompt}</pre></details>}
  </li>;
}
