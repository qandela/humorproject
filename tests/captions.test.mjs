import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCaptionPrompt, parseCaptionInput, parseVote, getDailyBrief } from "../src/lib/captions.ts";

const form = (values) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

test("generation input is validated before an AI request is made", () => {
  assert.ok(parseCaptionInput(form({ scene: "short", topic: "Campus", tone: "Dry" })).error);
  assert.ok(parseCaptionInput(form({ scene: "x".repeat(401), topic: "Campus", tone: "Dry" })).error);
  assert.ok(parseCaptionInput(form({ scene: "A perfectly good campus scene", topic: "Unknown", tone: "Dry" })).error);
  assert.ok(parseCaptionInput(form({ scene: "A perfectly good campus scene", topic: "Campus", tone: "Unknown" })).error);
  const input = parseCaptionInput(form({ scene: "  A perfectly good campus scene  ", topic: "Campus", tone: "Dry" }));
  assert.equal(input.scene, "A perfectly good campus scene");
  const prompt = buildCaptionPrompt(input);
  assert.match(prompt, /Columbia College junior/);
  assert.match(prompt, /Topic: Campus/);
  assert.match(prompt, /Tone: Dry/);
  assert.ok(prompt.endsWith(`Scene: ${input.scene}`));
});

test("votes only accept a real caption identifier and +1 or -1", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.deepEqual(parseVote(form({ caption_id: id, value: "-1" })), { captionId: id, value: -1 });
  assert.equal(parseVote(form({ caption_id: id, value: "0" })), null);
  assert.equal(parseVote(form({ caption_id: "invalid", value: "1" })), null);
  assert.equal(parseVote(form({ caption_id: id, value: "1 OR 1=1" })), null);
});

test("the daily brief changes at New York midnight rather than UTC midnight", () => {
  const a = getDailyBrief(new Date("2026-11-05T23:00:00Z"));
  const b = getDailyBrief(new Date("2026-11-06T04:59:00Z"));
  const c = getDailyBrief(new Date("2026-11-06T05:01:00Z"));
  assert.equal(a.scene, b.scene);
  assert.notEqual(a.scene, c.scene);
  assert.equal(a.date, "Nov 5");
});
