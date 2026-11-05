import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getDailyBrief } from "@/lib/captions";
import { CreateForm } from "./create-form";

export default function CreatePage() {
  return <main className="account-page"><Suspense fallback={<p role="status">Opening the caption studio…</p>}><CreateContent /></Suspense></main>;
}

async function CreateContent() {
  await requireUser();
  const brief = getDailyBrief();
  return <section className="account-panel">
    <p className="eyebrow">Caption studio / Members only</p>
    <h1>Your life. AI’s punchline.</h1>
    <p>Turn a very specific moment into something the group chat will understand. Try today’s scene or write your own.</p>
    <CreateForm brief={brief} configured={Boolean(process.env.GEMINI_API_KEY)} />
  </section>;
}
