"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { buildCaptionPrompt, isUuid, parseCaptionInput } from "@/lib/captions";
import { generateCaptionResult, GenerationError, getGeminiModel } from "@/lib/gemini";

export type CreateState = { error?: string };

export async function createCaption(_previous: CreateState, formData: FormData): Promise<CreateState> {
  const { supabase } = await requireUser("/create");
  const input = parseCaptionInput(formData);
  if ("error" in input) return { error: input.error };
  if (!process.env.GEMINI_API_KEY) return { error: "AI generation is not configured yet. Please check back soon." };
  let model: string;
  try { model = getGeminiModel(); } catch { return { error: "AI generation is not configured correctly. Please check back soon." }; }
  let prompt = buildCaptionPrompt(input);
  const fields = { p_scene: input.scene, p_topic: input.topic, p_tone: input.tone, p_prompt: prompt, p_model: model };
  const observed = await supabase.rpc("reserve_observed_generation", fields);
  // Keep the existing app usable while the owner installs the Week 7 migration.
  const legacy = observed.error?.code === "PGRST202";
  const reservation = legacy ? await supabase.rpc("reserve_generation", fields) : observed;
  const reservationError = reservation.error;
  const requestId = legacy ? reservation.data : reservation.data?.id;
  if (!legacy && typeof reservation.data?.prompt === "string") prompt = reservation.data.prompt;
  if (reservationError || !isUuid(requestId)) {
    revalidatePath("/create");
    return { error: reservationError?.message?.includes("generation_limit")
      ? "You have used your 10 generation attempts for the last 24 hours. Come back when your next slot opens."
      : "We could not start your generation. Please try again shortly." };
  }

  let content: string;
  let inputTokens: number | null = null, outputTokens: number | null = null;
  const started = performance.now();
  const latency = () => Math.min(300000, Math.max(0, Math.round(performance.now() - started)));
  try {
    const result = await generateCaptionResult(prompt, model);
    content = result.content; inputTokens = result.inputTokens; outputTokens = result.outputTokens;
  } catch (error) {
    if (legacy) await supabase.rpc("fail_generation", { p_request_id: requestId });
    else await supabase.rpc("finish_observed_generation", { p_request_id: requestId, p_content: null, p_error: error instanceof GenerationError ? error.reason : "upstream", p_latency_ms: latency() });
    revalidatePath("/create");
    revalidatePath("/my-captions");
    if (error instanceof GenerationError && error.reason === "configuration") return { error: "The caption service is temporarily unavailable. Your scene is still here; please try again later." };
    return { error: error instanceof GenerationError && error.reason === "quota"
      ? "The AI service is busy or its quota is used up. Please try again later."
      : "The AI could not finish this caption. Please try again with a different scene. This attempt counts toward your daily limit." };
  }

  const { data: captionId, error: saveError } = legacy
    ? await supabase.rpc("publish_caption", { p_request_id: requestId, p_content: content })
    : await supabase.rpc("finish_observed_generation", { p_request_id: requestId, p_content: content, p_error: null, p_latency_ms: latency(), p_input_tokens: inputTokens, p_output_tokens: outputTokens });
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
