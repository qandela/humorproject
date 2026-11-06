"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { buildCaptionPrompt, isUuid, parseCaptionInput } from "@/lib/captions";
import { generateCaption, GenerationError, getGeminiModel } from "@/lib/gemini";

export type CreateState = { error?: string };

export async function createCaption(_previous: CreateState, formData: FormData): Promise<CreateState> {
  const { supabase } = await requireUser("/create");
  const input = parseCaptionInput(formData);
  if ("error" in input) return { error: input.error };
  if (!process.env.GEMINI_API_KEY) return { error: "AI generation is not configured yet. Please check back soon." };
  let model: string;
  try { model = getGeminiModel(); } catch { return { error: "AI generation is not configured correctly. Please check back soon." }; }
  const prompt = buildCaptionPrompt(input);
  const { data: requestId, error: reservationError } = await supabase.rpc("reserve_generation", {
    p_scene: input.scene, p_topic: input.topic, p_tone: input.tone, p_prompt: prompt, p_model: model,
  });
  if (reservationError || !isUuid(requestId)) {
    revalidatePath("/create");
    return { error: reservationError?.message?.includes("generation_limit")
      ? "You have used your 10 generation attempts for the last 24 hours. Come back when your next slot opens."
      : "We could not start your generation. Please try again shortly." };
  }

  let content: string;
  try {
    content = await generateCaption(prompt, model);
  } catch (error) {
    await supabase.rpc("fail_generation", { p_request_id: requestId });
    revalidatePath("/create");
    revalidatePath("/my-captions");
    if (error instanceof GenerationError && error.reason === "configuration") return { error: "The caption service is temporarily unavailable. Your scene is still here; please try again later." };
    return { error: error instanceof GenerationError && error.reason === "quota"
      ? "The AI service is busy or its quota is used up. Please try again later."
      : "The AI could not finish this caption. Please try again with a different scene. This attempt counts toward your daily limit." };
  }

  const { data: captionId, error: saveError } = await supabase.rpc("publish_caption", { p_request_id: requestId, p_content: content });
  if (saveError || !isUuid(captionId)) {
    await supabase.rpc("fail_generation", { p_request_id: requestId });
    revalidatePath("/create");
    revalidatePath("/my-captions");
    return { error: "The caption could not be saved. Please try again shortly." };
  }
  revalidatePath("/");
  revalidatePath("/create");
  revalidatePath("/my-captions");
  redirect(`/?caption=${captionId}&created=1`);
}
