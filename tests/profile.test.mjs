import assert from "node:assert/strict";
import { test } from "node:test";
import { parseProfileNames, validatePhoto, MAX_PHOTO_BYTES } from "../src/lib/profile.ts";

function names(first, last) {
  const data = new FormData();
  data.set("first_name", first);
  data.set("last_name", last);
  return data;
}

test("blank names are nullable and entered names are trimmed", () => {
  assert.deepEqual(parseProfileNames(names("  ", "")), { firstName: null, lastName: null });
  assert.deepEqual(parseProfileNames(names(" Ada ", " Lovelace ")), { firstName: "Ada", lastName: "Lovelace" });
});

test("long names and non-text input are rejected", () => {
  assert.ok(parseProfileNames(names("x".repeat(81), "")).error);
  assert.ok(parseProfileNames(new FormData()).error);
  const data = names("Ada", "");
  data.set("first_name", new File(["data"], "name.txt"));
  assert.ok(parseProfileNames(data).error);
});

test("photo uploads require both an allowed type and its image signature", async () => {
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const file = new File([png], "photo.png", { type: "image/png" });
  assert.deepEqual(await validatePhoto(file), { extension: "png", contentType: "image/png" });
  assert.ok((await validatePhoto(new File(["not an image"], "fake.png", { type: "image/png" }))).error);
  assert.ok((await validatePhoto(new File(["<svg></svg>"], "photo.svg", { type: "image/svg+xml" }))).error);
});

test("JPEG and WebP files are accepted", async () => {
  const jpeg = new File([new Uint8Array([255, 216, 255, 224])], "photo.jpg", { type: "image/jpeg" });
  const webp = new File(["RIFF1234WEBP"], "photo.webp", { type: "image/webp" });
  assert.equal((await validatePhoto(jpeg)).extension, "jpg");
  assert.equal((await validatePhoto(webp)).extension, "webp");
});

test("oversized and empty photos are rejected", async () => {
  assert.ok((await validatePhoto(new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], "large.png", { type: "image/png" }))).error);
  assert.ok((await validatePhoto(new File([], "empty.png", { type: "image/png" }))).error);
});
