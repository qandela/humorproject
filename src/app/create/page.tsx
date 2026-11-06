import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDailyBrief, isUuid, type Caption, type CaptionInput } from "@/lib/captions";
import { generationUsage } from "@/lib/usage";
import { CreateForm } from "./create-form";

export const maxDuration = 60;

export default function CreatePage(props: PageProps<"/create">) {
  return <main className="studio-page"><Suspense fallback={<p className="notice-panel" role="status">Opening the caption studio…</p>}><CreateContent searchParams={props.searchParams} /></Suspense></main>;
}

async function CreateContent({ searchParams }: Pick<PageProps<"/create">, "searchParams">) {
  const { supabase, user } = await requireUser("/create");
  const params = await searchParams;
  const daily = getDailyBrief();
  let initial: CaptionInput = daily;
  let source = "Today’s scene is ready to try. You can also write your own.";
  let sourceKey = "daily";
  if (isUuid(params.remix)) {
    const { data } = await supabase.rpc("get_caption_feed", { p_sort: "new", p_topic: "all", p_caption_id: params.remix });
    const caption = (data as Caption[] | null)?.[0];
    if (caption) { initial = caption; source = "You’re remixing a scene. Change the tone or add your own twist."; sourceKey = params.remix; }
  } else if (isUuid(params.request)) {
    const { data } = await supabase.from("generation_requests").select("scene,topic,tone").eq("id", params.request).eq("user_id", user.id).maybeSingle();
    if (data) { initial = data as CaptionInput; source = "Your saved scene is back. Give it a new angle."; sourceKey = params.request; }
  }
  const { data: attempts, error } = await supabase.from("generation_requests").select("created_at").eq("user_id", user.id).gt("created_at", new Date(Date.now() - 86400000).toISOString()).order("created_at", { ascending: true }).limit(11);
  const usage = error ? null : generationUsage((attempts ?? []).map(row => row.created_at));
  return <>
    <header className="studio-header"><p className="eyebrow">The caption studio</p><h1>A good scene.<br /><em>A better punchline.</em></h1><p>Bring the moment. Choose the mood. Let AI find a line worth sharing.</p></header>
    <div className="studio-layout"><section className="studio-form-panel" aria-labelledby="studio-form-title">
      <div className="studio-panel-heading"><div><span className="step-marker">01</span><h2 id="studio-form-title">Make it yours</h2></div><span className="usage-pill">{usage ? `${usage.remaining} of 10 attempts left` : "Usage unavailable"}</span></div>
      <p className="studio-source">{source}</p>
      <CreateForm key={sourceKey} brief={initial} daily={daily} configured={Boolean(process.env.GEMINI_API_KEY)} remaining={usage?.remaining ?? null} nextSlot={usage?.nextSlot ?? null} />
    </section><aside className="studio-guide"><span className="step-marker">A little inspiration</span><h2>Specific is<br />where it’s at.</h2><p>“College is hard” is a topic. “My study group spent two hours choosing a playlist” is a scene.</p><div className="guide-rule" /><h3>What happens next?</h3><ol><li>AI writes one caption for your scene.</li><li>It’s published for the community to vote on.</li><li>You can copy it, share it, or remix the scene.</li></ol><Link href="/my-captions">Find your past creations →</Link></aside></div>
  </>;
}
