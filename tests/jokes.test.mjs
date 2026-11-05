import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { getJokes } from "../src/lib/jokes.ts";

const originalUrl = process.env.SUPABASE_URL;
const originalKey = process.env.SUPABASE_ANON_KEY;

beforeEach(() => {
  process.env.SUPABASE_URL = "https://test-project.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
});

afterEach(() => {
  mock.restoreAll();
  if (originalUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.SUPABASE_ANON_KEY;
  else process.env.SUPABASE_ANON_KEY = originalKey;
});

test("missing configuration never issues a database request", async () => {
  delete process.env.SUPABASE_ANON_KEY;
  const fetchMock = mock.method(globalThis, "fetch", () => {
    throw new Error("Unexpected request");
  });
  assert.equal((await getJokes()).status, "unconfigured");
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("reads and returns database rows with anonymous, uncached requests", async () => {
  const rows = [{ id: 1, category: "Test", setup: "Question?", punchline: "Answer." }];
  const fetchMock = mock.method(globalThis, "fetch", async () => Response.json(rows));
  assert.deepEqual(await getJokes(), { status: "success", jokes: rows });
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url.origin, "https://test-project.supabase.co");
  assert.equal(url.pathname, "/rest/v1/jokes");
  assert.equal(url.searchParams.get("select"), "id,category,setup,punchline");
  assert.equal(url.searchParams.get("order"), "id.asc");
  assert.equal(options.headers.apikey, "test-anon-key");
  assert.equal(options.cache, "no-store");
  assert.ok(options.signal instanceof AbortSignal);
});

test("an empty table stays empty instead of showing sample rows", async () => {
  mock.method(globalThis, "fetch", async () => Response.json([]));
  assert.deepEqual(await getJokes(), { status: "success", jokes: [] });
});

test("API failures do not expose the upstream response or credentials", async () => {
  mock.method(globalThis, "fetch", async () => new Response("private error details", { status: 403 }));
  const result = await getJokes();
  assert.equal(result.status, "error");
  assert.deepEqual(result.jokes, []);
  assert.doesNotMatch(JSON.stringify(result), /private error|test-anon-key/);
});

test("a network failure produces a recoverable error state", async () => {
  mock.method(globalThis, "fetch", async () => { throw new Error("Network unavailable"); });
  assert.equal((await getJokes()).status, "error");
});

test("malformed rows produce an error instead of crashing the list", async () => {
  mock.method(globalThis, "fetch", async () => Response.json([{ id: 1, setup: null }]));
  assert.equal((await getJokes()).status, "error");
});
