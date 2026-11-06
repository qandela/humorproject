import assert from "node:assert/strict";
import { test } from "node:test";
import { safeReturnPath, loginPath } from "../src/lib/navigation.ts";
import { generationUsage } from "../src/lib/usage.ts";

test("sign-in can restore a caption, remix, or private collection", () => {
  const caption = "/?caption=11111111-1111-4111-8111-111111111111";
  for (const path of [caption, "/my-captions", "/create?remix=11111111-1111-4111-8111-111111111111"]) {
    assert.equal(safeReturnPath(path), path);
    assert.equal(new URL(loginPath(path), "https://app.local").searchParams.get("returnTo"), path);
  }
});

test("callback return paths reject external URLs and browser URL tricks", () => {
  for (const path of [undefined, null, "https://evil.example", "//evil.example", "/\\evil.example", "/auth/callback", "/unknown", "/%2f%2fevil.example", "/create\n", "javascript:alert(1)", "x".repeat(3000)]) {
    assert.equal(safeReturnPath(path), "/profile");
  }
  assert.equal(safeReturnPath("/create#fragment"), "/create");
});

test("remaining attempts include failed/pending attempts and slots reopen after 24 hours", () => {
  const now = Date.parse("2026-11-06T18:00:00Z");
  const dates = Array.from({length: 10}, (_, i) => new Date(now - 3600000 - i * 1000).toISOString());
  const usage = generationUsage(dates, now);
  assert.equal(usage.remaining, 0);
  assert.equal(usage.nextSlot, new Date(now - 3600000 - 9000 + 86400000).toISOString());
  assert.equal(generationUsage(dates, now + 86400000).remaining, 10);
  assert.equal(generationUsage(["invalid", new Date(now - 86400000).toISOString()], now).remaining, 10);
});
