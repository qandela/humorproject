# The Humor Project — Campus to City

A Next.js app for AI-generated campus and NYC captions. Anyone can browse; Google sign-in is required to generate captions, vote, visit the members lounge, or edit a profile.

## Week 5 iteration

Follow **[WEEK5_SETUP.md](WEEK5_SETUP.md)** for the iteration details, verification, and final deployment checklist. No new SQL migration is needed. Hypothetical feedback is clearly labeled in **[PM_FEEDBACK.md](PM_FEEDBACK.md)**.

## Week 4 setup

Follow **[WEEK4_SETUP.md](WEEK4_SETUP.md)** for the database migration, Gemini key, Vercel configuration, verification, and submission checklist.

The feedback log distinguishes hypothetical review suggestions from actual PM feedback.

## Features

- Public caption feed with New, Today's best, Top all time, and topic filters.
- Daily campus/city scene that rotates at New York midnight.
- Authenticated AI caption creation with an exact saved prompt and model ID.
- One immutable Funny/Pass vote per user and caption, stored as a new database row.
- Aggregate scores without public voter identities or other users' full prompts.
- Per-caption links, copy-text/copy-link controls, and scene remixing.
- Private My captions history and sign-in that restores the intended destination.
- Protected `/create`, `/my-captions`, `/members`, and `/profile` routes.
- Google OAuth, nullable profile names, and private photo uploads from Week 3.
- Original Supabase joke collection preserved at `/jokes`.

## Database setup order

In your existing Supabase project's SQL Editor:

1. [`supabase/setup.sql`](supabase/setup.sql) — original jokes.
2. [`supabase/auth-setup.sql`](supabase/auth-setup.sql) — profiles, signup trigger, private avatar storage.
3. [`supabase/rating-setup.sql`](supabase/rating-setup.sql) — generations, captions, votes, RLS, and owner-checked RPCs.

The scripts preserve existing app rows when rerun. The Week 4 migration enables RLS on every public table; known application tables receive explicit least-privilege grants and policies.

## Environment variables

Copy `.env.example` to `.env.local` and replace the placeholders. Real values belong only in `.env.local` and the existing Vercel project's environment variables.

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Existing Supabase project origin |
| `SUPABASE_ANON_KEY` | Existing anon or publishable key |
| `GEMINI_API_KEY` | Server-only key for AI generation |
| `GEMINI_MODEL` | Optional model override; defaults to `gemini-3.5-flash` |

Google OAuth client credentials belong in Supabase's Google provider settings. For the Google configuration and `/auth/callback` allowlist, see **[WEEK3_SETUP.md](WEEK3_SETUP.md)**.

## Run and verify

Use Node.js 22 LTS:

```sh
npm ci
npm test
npm run build
npm run dev
```

With the local server running, in a second terminal:

```sh
npm run test:auth
```

Tests cover provider-response validation, daily scenes, vote inputs, the actual SQL migrations in a local PostgreSQL-compatible engine, row ownership, private prompts, immutable/unique votes, generation quotas, existing profile behavior, and signed-out route redirects.

A passing build or mocked AI test does not prove live Gemini/Supabase configuration. Generate and vote on a real caption after running the migration and adding the key. Keep Vercel deployment protection disabled, test the final unique deployment URL in Incognito, complete the PM iteration, and submit that exact URL.

## Week 7 generation observability

The rating app now uses `reserve_observed_generation` and `finish_observed_generation` from the admin repository's `supabase/observability-setup.sql`. Run that migration in the existing Supabase project after the Week 6 admin migration. It records the sampled prompt chain, exact composed prompt, response/failure category, elapsed time, and provider-reported token counts. Existing voting and ownership rules remain in place. Until the new reservation RPC exists, the original generation workflow remains available.

The admin repository documents the schema, private resource management, and migration steps: https://github.com/qandela/humorproject-admin/blob/main/WEEK7.md . Keep API keys in environment variables; the model/provider catalog does not store secrets or change the executable model selected by `GEMINI_MODEL`.
