// Chrome UI checks use a local fixture service, never live user sessions or real AI credits.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { startFixture, captionId, fixtureCaption } from "./ui-fixture.mjs";

const fixture = await startFixture();
const origin = "http://localhost:3001";
const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3001"], {
  env: { ...process.env, SUPABASE_URL: `http://127.0.0.1:${fixture.port}`, SUPABASE_ANON_KEY: "ui-fixture-key", GEMINI_API_KEY: "ui-fixture-never-sent-to-provider" },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
app.stdout.on("data", chunk => { output = (output + chunk).slice(-6000); });
app.stderr.on("data", chunk => { output = (output + chunk).slice(-6000); });
let browser;
let page;
try {
  let ready = false;
  for (let i=0; i<100; i++) {
    try { if ((await fetch(origin)).ok) { ready=true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, `Local test app did not start. ${output}`);
  const chrome = process.env.HUMOR_CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, permissions: ["clipboard-read", "clipboard-write"] });
  page = await context.newPage();
  page.setDefaultTimeout(10000);
  const failures=[];
  page.on("pageerror", error => failures.push(error.message));
  await page.goto(origin);
  await page.getByText(fixtureCaption, { exact: true }).waitFor();
  assert.equal(await page.getByRole("link", { name: "Sign in to vote on this caption" }).count(), 2);
  assert.equal(await page.getByRole("button", { name: "Funny", exact: false }).count(), 0);
  const desktop = join(tmpdir(), "humorproject-week5-desktop.png");
  await page.screenshot({ path: desktop, fullPage: true });
  for (const path of ["/create", "/my-captions"]) {
    await page.goto(origin+path);
    await page.getByRole("button", { name: "Continue with Google" }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/login");
    assert.equal(new URL(page.url()).searchParams.get("returnTo"), path);
    assert.equal(await page.locator('input[name="return_to"]').inputValue(), path);
  }
  await page.goto(`${origin}/?caption=${captionId}`);
  await page.getByRole("link", { name: "Sign in to vote on this caption", exact: false }).click();
  await page.getByRole("button", { name: "Continue with Google" }).click();
  const funny=page.getByRole("button", { name: "Funny", exact: true });
  await funny.waitFor();
  assert.equal(new URL(page.url()).searchParams.get("caption"), captionId);
  assert.equal(new URL(page.url()).pathname, "/");
  assert.equal((await context.cookies()).some(cookie => cookie.name === "humor-return-to"), false);
  await funny.click();
  await page.getByText("Your Funny vote is saved.", { exact: false }).waitFor();
  assert.equal(fixture.votes.get(captionId), 1);
  await page.reload();
  await page.getByText("Your Funny vote is saved.", { exact: false }).waitFor();
  assert.ok(await page.getByRole("button", { name: "Funny", exact: false }).isDisabled());
  await page.getByRole("button", { name: "Copy text", exact: true }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), fixtureCaption);
  await page.getByRole("link", { name: "Remix this scene", exact: false }).click();
  await page.getByRole("textbox", { name: "Set the scene", exact: true }).waitFor();
  assert.match(await page.getByRole("textbox", { name: "Set the scene", exact: true }).inputValue(), /playlist/);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Mobile studio overflows horizontally");
  await page.getByRole("combobox", { name: "Topic", exact: true }).selectOption("Dorm life");
  await page.getByRole("combobox", { name: "Tone", exact: true }).selectOption("Wholesome");
  const edited="My roommate organized an entire dorm dinner using one microwave.";
  await page.getByRole("textbox", { name: "Set the scene", exact: true }).fill(edited);
  await page.getByRole("button", { name: "Generate & publish caption" }).click();
  const formAlert = page.locator(".create-form").getByRole("alert");
  await formAlert.waitFor();
  assert.match(await formAlert.innerText(), /could not start your generation/);
  assert.equal(await page.getByRole("textbox", { name: "Set the scene", exact: true }).inputValue(), edited);
  assert.equal(await page.getByRole("combobox", { name: "Topic", exact: true }).inputValue(), "Dorm life");
  assert.equal(await page.getByRole("combobox", { name: "Tone", exact: true }).inputValue(), "Wholesome");
  await page.screenshot({ path: join(tmpdir(), "humorproject-week5-studio.png"), fullPage: true });
  await page.getByRole("link", { name: "My captions", exact: true }).click();
  await page.getByRole("heading", { name: "Good lines. Worth keeping." }).waitFor();
  await page.getByRole("heading", { name: fixtureCaption, exact: true, level: 2 }).waitFor();
  await page.screenshot({ path: join(tmpdir(), "humorproject-week5-library.png"), fullPage: true });
  await page.getByRole("link", { name: "Reuse this scene", exact: false }).click();
  await page.getByRole("textbox", { name: "Set the scene", exact: true }).waitFor();
  assert.match(await page.getByRole("textbox", { name: "Set the scene", exact: true }).inputValue(), /playlist/);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("button", { name: "Continue with Google" }).waitFor();
  await page.goto(origin+"/my-captions");
  await page.getByRole("button", { name: "Continue with Google" }).waitFor();
  assert.equal(new URL(page.url()).pathname, "/login");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin);
  await page.getByText(fixtureCaption, { exact: true }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Mobile page overflows horizontally");
  await page.screenshot({ path: join(tmpdir(), "humorproject-week5-mobile.png"), fullPage: true });
  assert.deepEqual(failures, [], "Browser runtime errors");
  console.log("Chrome UI checks passed: public feed, protected routes, restored destination, saved voting, clipboard, remix, private history, error-state input preservation, logout, and mobile overflow.");
  console.log(`Desktop screenshot: ${desktop}`);
  console.log(`Mobile screenshot: ${join(tmpdir(), "humorproject-week5-mobile.png")}`);
} catch (error) {
  console.error(output);
  if (page) { console.error("Failed page URL:", page.url()); console.error((await page.locator("body").innerText()).slice(0, 3500)); await page.screenshot({ path: join(tmpdir(), "humorproject-week5-ui-failure.png"), fullPage: true }); }
  throw error;
} finally {
  await browser?.close();
  app.kill("SIGTERM");
  await new Promise(resolve => fixture.server.close(resolve));
}
