// Run against `npm start` or `npm run dev`, with Google configured separately.
import assert from "node:assert/strict";

const origin = process.env.AUTH_TEST_ORIGIN ?? "http://localhost:3000";
async function request(path, options = {}) {
  return fetch(new URL(path, origin), { ...options, redirect: "manual" });
}
const publicPage = await request("/");
assert.equal(publicPage.status, 200);
assert.match(await publicPage.text(), /New York moments/);
console.log("Public collection is accessible without cookies.");

for (const path of ["/members", "/profile", "/create"]) {
  const response = await request(path);
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location"), origin).pathname, "/login");
  assert.doesNotMatch(await response.text(), /Signed in as/);
  console.log(`${path} requires login.`);
}

const callback = await request("/auth/callback?next=https://example.org");
assert.equal(callback.status, 307);
const callbackTarget = new URL(callback.headers.get("location"), origin);
assert.equal(callbackTarget.pathname, "/login");
assert.equal(callbackTarget.searchParams.get("error"), "callback");
assert.notEqual(callbackTarget.hostname, "example.org");
console.log("An invalid callback does not redirect to an external next parameter.");

const login = await request("/login");
assert.equal(login.status, 200);
const loginHtml = await login.text();
assert.match(loginHtml, /Continue with Google/);
const action = loginHtml.match(/name="(\$ACTION_ID_[^"]+)"/);
assert.ok(action, "The Google sign-in form must exist.");
const form = new FormData();
form.set(action[1], "");
const oauth = await request("/login", { method: "POST", headers: { Origin: origin }, body: form });
assert.equal(oauth.status, 303);
const target = new URL(oauth.headers.get("location"));
assert.equal(target.pathname, "/auth/v1/authorize");
assert.equal(target.searchParams.get("provider"), "google");
assert.equal(target.searchParams.get("redirect_to"), `${origin}/auth/callback`);
assert.ok(target.searchParams.get("code_challenge"));
assert.ok(oauth.headers.get("set-cookie"));
console.log("Google OAuth starts with PKCE and exactly /auth/callback.");
console.log("Auth smoke checks passed. Real Google login and profile persistence require manual account setup and verification.");
