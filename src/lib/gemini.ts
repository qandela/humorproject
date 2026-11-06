export class GenerationError extends Error {
  reason: "configuration" | "quota" | "upstream" | "output";
  constructor(reason: "configuration" | "quota" | "upstream" | "output") {
    super(reason);
    this.reason = reason;
  }
}

export function getGeminiModel() {
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  if (!/^[a-z0-9.-]{1,100}$/.test(model)) throw new GenerationError("configuration");
  return model;
}

export type CaptionResult = { content: string; inputTokens: number | null; outputTokens: number | null };

export async function generateCaption(prompt: string, model: string): Promise<string> {
  return (await generateCaptionResult(prompt, model)).content;
}

export async function generateCaptionResult(prompt: string, model: string): Promise<CaptionResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GenerationError("configuration");
  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseSchema: { type: "OBJECT", properties: { caption: { type: "STRING" } }, required: ["caption"] },
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new GenerationError("upstream");
  }
  if (response.status === 429) throw new GenerationError("quota");
  if ([400, 401, 403, 404].includes(response.status)) throw new GenerationError("configuration");
  if (!response.ok) throw new GenerationError("upstream");
  try {
    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason !== "STOP") throw new Error("Incomplete response");
    const text = candidate.content?.parts?.filter((part: { text?: string; thought?: boolean }) => !part.thought).map((part: { text?: string }) => part.text ?? "").join("");
    const parsed = JSON.parse(text ?? "");
    if (typeof parsed.caption !== "string" || !parsed.caption.trim() || [...parsed.caption.trim()].length > 240) throw new Error("Invalid caption");
    const tokenCount = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 2147483647 ? value : null;
    return { content: parsed.caption.trim(), inputTokens: tokenCount(data.usageMetadata?.promptTokenCount), outputTokens: tokenCount(data.usageMetadata?.candidatesTokenCount) };
  } catch {
    throw new GenerationError("output");
  }
}
