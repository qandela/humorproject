# Week 5 — Iteration and production checks

The existing Week 4 app now has a clearer creation/voting journey and a more polished responsive layout. No new Supabase migration or environment variable is required for this iteration.

## What changed

- Private **My captions** history reads the user's existing generation requests and linked published captions.
- **Remix this scene** reuses a public scene with a new topic/tone; **Reuse this scene** restores an owner's previous request. New generations still save a new prompt and caption.
- Sign-in remembers the intended internal destination instead of always sending users to Profile. The OAuth redirect target is still exactly `/auth/callback`; the destination is stored in an HttpOnly cookie, not callback query parameters.
- **Copy text** and **Copy link** have separate controls and status feedback.
- Vote labels explain +1 Funny and −1 Not quite. A saved vote stays selected and cannot be duplicated.
- Creation inputs preserve edits after errors, show tone descriptions, and display remaining attempts and the next slot when all 10 are used.
- Caption detail pages foreground the caption and votes rather than repeating the large home-page introduction.
- Error and not-found pages provide a route back to the feed.
- Supabase session initialization explicitly waits for request time, preventing authenticated token-expiry checks from running during prerendering.

## Feedback provenance

[PM_FEEDBACK.md](PM_FEEDBACK.md) contains hypothetical suggestions requested by the user. No real PM session or implemented real-world feedback is claimed. Use the log to record actual feedback when the session takes place.

## Existing backend requirements

Keep the Week 4 tables, policies, and RPCs from `supabase/rating-setup.sql`. Do not disable RLS. Keep these Vercel variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
- Optional `GEMINI_MODEL`

The local `.env.local` is still ignored by Git. Vercel uses its own configured variables. The Week 4 setup guide remains available at [WEEK4_SETUP.md](WEEK4_SETUP.md).

## Deployment and submission

1. Open the Vercel deployment corresponding to the Week 5 commit and wait for **Ready**.
2. Copy its unique generated `.vercel.app` URL. Use the Week 5 deployment rather than an older Week 4 URL.
3. In **Supabase → Authentication → URL Configuration → Redirect URLs**, add this new origin plus `/auth/callback`. Keep existing valid entries.
4. Keep Vercel **Deployment Protection / Vercel Authentication** disabled.
5. If your Google OAuth client lists individual deployment origins, add the new origin there as needed. Google's authorized redirect URI stays at the Supabase project's `/auth/v1/callback`.
6. Run the checks below using that exact deployment.
7. Submit the tested commit-specific URL, including `https://`, to the course.

## Production acceptance checks

- [ ] In Incognito, the public home page and a shared caption load without Vercel authentication.
- [ ] Opening `/create` or `/my-captions` while signed out sends the visitor to Google sign-in.
- [ ] Signing in from a shared caption returns to that caption; signing in from Create returns to Create.
- [ ] Generate a real caption, verify it appears publicly, and find it under My captions.
- [ ] Cast a vote, refresh, and confirm the selected vote and score persist.
- [ ] Copy text and Copy link both work.
- [ ] Remix a scene, change its tone, and confirm it produces a new caption rather than modifying the old one.
- [ ] Another signed-in account cannot see your private request history or full prompts.
- [ ] Logout works; revisiting a private route requires login again.
- [ ] Check the layout on a narrow phone screen and with keyboard navigation.

## Automated verification

Use Node.js 22 LTS:

```sh
npm ci
npm test
npm run build
```

With the real local app running using `npm start` or `npm run dev`, check anonymous route protection and the start of OAuth:

```sh
npm run test:auth
```

The browser check starts its own app on port 3001 and a local Supabase-shaped fixture service. It never uses real user sessions or consumes AI credits:

```sh
npm run test:ui
```

The browser script uses installed Google Chrome on macOS by default. Set `HUMOR_CHROME_PATH` to another Chrome binary if needed, or install Playwright's Chromium with `npx playwright install chromium`. It writes desktop/mobile screenshots to the operating system temporary directory.

UI fixture checks do not prove that live Google consent or live AI generation works. The PostgreSQL-compatible engine tests exercise the actual RLS migrations; the Gemini tests use mocked provider responses. Complete the production checks above after deployment.
