import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { generateCaption, GenerationError } from "../src/lib/gemini.ts";

const original = process.env.GEMINI_API_KEY;
beforeEach(() => { process.env.GEMINI_API_KEY = "test-key-never-published"; });
afterEach(() => {
  mock.restoreAll();
  if (original === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = original;
});
const result = (caption, finishReason = "STOP") => Response.json({ candidates: [{ finishReason, content: { parts: [{ text: JSON.stringify({ caption }) }] } }] });

test("AI requests send the exact stored prompt and keep the key in a header", async () => {
  const request = mock.method(globalThis, "fetch", async () => result("  My commute has character development.  "));
  assert.equal(await generateCaption("the exact saved prompt", "test-model"), "My commute has character development.");
  const [url, options] = request.mock.calls[0].arguments;
  assert.ok(!url.includes(process.env.GEMINI_API_KEY));
  assert.equal(options.headers["x-goog-api-key"], process.env.GEMINI_API_KEY);
  assert.equal(JSON.parse(options.body).contents[0].parts[0].text, "the exact saved prompt");
  assert.equal(options.cache, "no-store");
});

test("missing API configuration never calls the provider", async () => {
  delete process.env.GEMINI_API_KEY;
  const request = mock.method(globalThis, "fetch", async () => result("Unexpected"));
  await assert.rejects(() => generateCaption("prompt", "test-model"), error => error instanceof GenerationError && error.reason === "configuration");
  assert.equal(request.mock.callCount(), 0);
});

test("quota responses become safe errors without exposing upstream details", async () => {
  mock.method(globalThis, "fetch", async () => new Response("internal provider details", { status: 429 }));
  await assert.rejects(() => generateCaption("prompt", "test-model"), error => error.reason === "quota" && !error.message.includes("provider details"));
});

test("blocked, truncated, missing, and oversized captions cannot be published", async () => {
  for (const response of [result("caption", "MAX_TOKENS"), result("x".repeat(241)), result(""), Response.json({ promptFeedback: { blockReason: "SAFETY" } }), Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "invalid json" }] } }] })]) {
    mock.method(globalThis, "fetch", async () => response);
    await assert.rejects(() => generateCaption("prompt", "test-model"), error => error.reason === "output");
    mock.restoreAll();
  }
});

test("a network failure is recoverable and does not expose credentials", async () => {
  mock.method(globalThis, "fetch", async () => { throw new Error("private error"); });
  await assert.rejects(() => generateCaption("prompt", "test-model"), error => error.reason === "upstream" && !error.message.includes("private"));
});

 test("invalid keys and unavailable models get configuration errors rather than prompting a new scene", async () => {
  for (const status of [400, 401, 403, 404]) {
    mock.method(globalThis, "fetch", async () => new Response("private provider details", { status }));
    await assert.rejects(() => generateCaption("prompt", "test-model"), error => error.reason === "configuration");
    mock.restoreAll();
  }
});

test("observability preserves provider usage counts without inventing missing metrics", async () => {
  const { generateCaptionResult } = await import("../src/lib/gemini.ts");
  mock.method(globalThis, "fetch", async () => Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ caption: "A real output in a mocked provider response." }) }] } }], usageMetadata: { promptTokenCount: 42, candidatesTokenCount: 13 } }));
  assert.deepEqual(await generateCaptionResult("exact prompt", "test-model"), { content: "A real output in a mocked provider response.", inputTokens: 42, outputTokens: 13 });
  mock.restoreAll();
  mock.method(globalThis, "fetch", async () => result("No token metadata supplied."));
  assert.deepEqual(await generateCaptionResult("exact prompt", "test-model"), { content: "No token metadata supplied.", inputTokens: null, outputTokens: null });
});
