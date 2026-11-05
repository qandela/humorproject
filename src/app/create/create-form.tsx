"use client";

import { useActionState, useState } from "react";
import { createCaption, type CreateState } from "./actions";
import { TOPICS, TONES, type CaptionInput } from "@/lib/captions";

export function CreateForm({ brief, configured }: { brief: CaptionInput; configured: boolean }) {
  const [state, action, pending] = useActionState<CreateState, FormData>(createCaption, {});
  const [scene, setScene] = useState(brief.scene);
  return <form action={action} className="profile-form create-form">
    <label htmlFor="scene">Set the scene
      <textarea id="scene" name="scene" value={scene} onChange={event => setScene(event.target.value)} minLength={12} maxLength={400} required rows={5} aria-describedby="scene-help" />
    </label>
    <div className="scene-help"><p id="scene-help">An oddly specific campus moment, dorm dilemma, or city adventure.</p><span>{scene.length}/400</span></div>
    <div className="name-fields">
      <label htmlFor="topic">Topic<select id="topic" name="topic" defaultValue={brief.topic}>{TOPICS.map(topic => <option key={topic}>{topic}</option>)}</select></label>
      <label htmlFor="tone">Tone<select id="tone" name="tone" defaultValue={brief.tone}>{TONES.map(tone => <option key={tone}>{tone}</option>)}</select></label>
    </div>
    <p className="field-help">Your scene and AI caption will be public. Your full generation prompt is saved privately. You have up to 10 attempts per 24 hours, including failed attempts.</p>
    {!configured && <p className="form-message" role="status">AI generation is not connected yet. Please check back soon.</p>}
    {state.error && <p className="form-message" role="alert">{state.error}</p>}
    <button className="button" type="submit" disabled={pending || !configured}>{pending ? "Finding the funny…" : "Generate & publish caption →"}</button>
    {pending && <p className="field-help" role="status">This can take a few seconds. Your caption will appear in the feed when it’s ready.</p>}
  </form>;
}
