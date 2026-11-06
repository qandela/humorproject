"use client";

import { useActionState, useState } from "react";
import { createCaption, type CreateState } from "./actions";
import { TOPICS, TONES, type CaptionInput } from "@/lib/captions";

export function CreateForm({ brief, daily, configured, remaining, nextSlot }: { brief: CaptionInput; daily: CaptionInput; configured: boolean; remaining: number | null; nextSlot: string | null }) {
  const [state, action, pending] = useActionState<CreateState, FormData>(createCaption, {});
  const [input, setInput] = useState<CaptionInput>({ scene: brief.scene, topic: brief.topic, tone: brief.tone });
  const [editing, setEditing] = useState(false);
  function update(values: Partial<CaptionInput>) { setInput(current => ({ ...current, ...values })); setEditing(true); }
  const tooShort = input.scene.trim().length < 12;
  // Successful actions navigate away. Returned errors must not reset the native selects.
  return <form action={action} className="profile-form create-form" onSubmit={() => setEditing(false)} onReset={event => event.preventDefault()}>
    <div className="form-field"><label htmlFor="scene">Set the scene</label>
      <textarea id="scene" name="scene" value={input.scene} onChange={event => update({ scene: event.target.value })} minLength={12} maxLength={400} required rows={5} aria-describedby="scene-help" disabled={pending} />
    </div>
    <div className="scene-help"><p id="scene-help">{tooShort ? "Add a little detail: at least 12 characters." : "A real moment. The more specific, the better."}</p><span>{input.scene.length}/400</span></div>
    <div className="scene-tools"><button type="button" onClick={() => update(daily)} disabled={pending}>↻ Use today’s scene</button><button type="button" onClick={() => update({ scene: "" })} disabled={pending || !input.scene}>Start blank</button></div>
    <div className="name-fields">
      <div className="form-field"><label htmlFor="topic">Topic</label><select id="topic" name="topic" value={input.topic} onChange={event => update({ topic: event.target.value as CaptionInput["topic"] })} disabled={pending}>{TOPICS.map(topic => <option key={topic}>{topic}</option>)}</select></div>
      <div className="form-field"><label htmlFor="tone">Tone</label><select id="tone" name="tone" value={input.tone} onChange={event => update({ tone: event.target.value as CaptionInput["tone"] })} disabled={pending}>{TONES.map(tone => <option key={tone}>{tone}</option>)}</select></div>
    </div>
    <p className="tone-explainer">{input.tone === "Dry" ? "Low-key, deadpan, and a little too accurate." : input.tone === "Chaotic" ? "Dramatic energy for a very ordinary situation." : "A softer take with something to smile about."}</p>
    {!configured && <p className="form-message" role="status">The studio isn’t ready to generate yet. Your scene is still here; please try again later.</p>}
    {remaining === 0 && <p className="form-message" role="status">You’ve used your 10 attempts for now.{nextSlot ? ` Your next slot opens ${new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(nextSlot))}.` : " Come back later for your next slot."}</p>}
    {state.error && !editing && <p className="form-message" role="alert">{state.error}</p>}
    <button className="button studio-submit" type="submit" disabled={pending || !configured || remaining === 0 || tooShort}>{pending ? "Finding the funny…" : "Generate & publish caption ↗"}</button>
    {pending && <p className="field-help" role="status">Usually a few seconds. Your caption will open as soon as it’s ready.</p>}
    <p className="field-help publish-note">Your scene and caption will be public. Full prompts are private to your account. Each AI request uses one of your 10 attempts per 24 hours, including unsuccessful requests.</p>
  </form>;
}
