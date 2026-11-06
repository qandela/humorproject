"use client";

import { useActionState } from "react";
import { castVote, type VoteState } from "@/app/vote-actions";

export function VoteForm({ captionId, initialVote }: { captionId: string; initialVote: number | null }) {
  const [state, action, pending] = useActionState<VoteState, FormData>(castVote, {});
  const selected = state.value ?? initialVote;
  const voted = selected === 1 || selected === -1;
  return <form action={action} className="vote-form">
    <input type="hidden" name="caption_id" value={captionId} />
    <div className="vote-buttons" aria-label="Rate this caption">
      <button type="submit" name="value" value="1" disabled={pending || voted} aria-pressed={selected === 1}>
        <span aria-hidden="true">{selected === 1 ? "✓" : "+1"}</span> Funny
      </button>
      <button type="submit" name="value" value="-1" disabled={pending || voted} aria-pressed={selected === -1}>
        <span aria-hidden="true">{selected === -1 ? "✓" : "−1"}</span> Not quite
      </button>
    </div>
    {pending ? <p className="vote-note" role="status">Saving your vote…</p> : state.error ? <p className="vote-note" role="alert">{state.error}</p> : voted ? <p className="vote-note voted" role="status">✓ Your {selected === 1 ? "Funny" : "Not quite"} vote is saved.</p> : <p className="vote-note">One vote. Go with your first reaction.</p>}
  </form>;
}
