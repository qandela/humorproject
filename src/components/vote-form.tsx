"use client";

import { useActionState } from "react";
import { castVote, type VoteState } from "@/app/vote-actions";

export function VoteForm({ captionId, initialVote }: { captionId: string; initialVote: number | null }) {
  const [state, action, pending] = useActionState<VoteState, FormData>(castVote, {});
  const selected = state.value ?? initialVote;
  return <form action={action} className="vote-form">
    <input type="hidden" name="caption_id" value={captionId} />
    <div className="vote-buttons" aria-label="Rate this caption">
      <button type="submit" name="value" value="1" disabled={pending || selected !== null && selected !== undefined} aria-pressed={selected === 1}>
        ↑ Funny{selected === 1 ? " ✓" : ""}
      </button>
      <button type="submit" name="value" value="-1" disabled={pending || selected !== null && selected !== undefined} aria-pressed={selected === -1}>
        ↓ Pass{selected === -1 ? " ✓" : ""}
      </button>
    </div>
    {pending && <p className="vote-note" role="status">Saving vote…</p>}
    {state.error && <p className="vote-note" role="alert">{state.error}</p>}
    {(state.message || selected) && <p className="vote-note" role="status">{state.message ?? "Your vote is saved."}</p>}
  </form>;
}
