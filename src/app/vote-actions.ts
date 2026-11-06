"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { parseVote } from "@/lib/captions";

export type VoteState = { error?: string; value?: number; message?: string };

export async function castVote(_previous: VoteState, data: FormData): Promise<VoteState> {
  const { supabase, user } = await requireUser("/");
  const vote = parseVote(data);
  if (!vote) return { error: "Choose a valid caption and vote." };
  const { error } = await supabase.from("votes").insert({ user_id: user.id, caption_id: vote.captionId, value: vote.value });
  if (error?.code === "23505") {
    const { data: existing } = await supabase.from("votes").select("value").eq("user_id", user.id).eq("caption_id", vote.captionId).maybeSingle();
    revalidatePath("/");
    return { value: existing?.value, message: "Your vote on this caption is already saved." };
  }
  if (error) return { error: "Your vote could not be saved. Please try again." };
  revalidatePath("/");
  return { value: vote.value, message: "Vote saved. Thanks for weighing in!" };
}
