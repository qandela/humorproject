# Week 4 — Campus to City: AI captions and voting

Continue with the same GitHub repository, Supabase project, Google OAuth client, and Vercel project.

## Product direction

Sam is a Columbia junior from the Midwest who is learning NYC, living in a dorm, and sharing things in a group chat. The app focuses on specific, familiar situations rather than generic jokes.

- **A reason to return:** a rotating daily scene changes at midnight in New York; Today's best ranks the current day's captions.
- **A reason to share:** every caption has a stable detail link and a Copy link button, so a group chat can discuss and rate the same caption.
- **A reason to contribute:** signed-in users can turn their own scene into an AI caption, choose a topic/tone, and immediately publish it.
- **A useful Crackd-style improvement:** pair creation with a clear starting prompt, a topic-specific feed, understandable ranking, and a visible saved-vote state. These are design proposals, not claims that PM feedback has validated them.
- **Intentional limits:** one immutable vote per account per caption; 10 generation attempts per rolling 24 hours. Failed provider attempts count. These limits keep scores understandable and reserve shared AI capacity.

PM feedback has not happened yet. Use [PM_FEEDBACK.md](PM_FEEDBACK.md) after the session. The feedback portion of the assignment is not complete until actual PM suggestions are recorded, implemented, and verified.

## 1. Run the database migration

1. Open your existing project at https://supabase.com/dashboard.
2. Confirm Week 2 `setup.sql` and Week 3 `auth-setup.sql` were run.
3. Open **SQL Editor → New query**.
4. Paste the entire contents of [`supabase/rating-setup.sql`](supabase/rating-setup.sql) and click **Run**.
5. Under **Table Editor**, confirm `generation_requests`, `captions`, and `votes` exist.

The migration preserves existing jokes and profiles. It enables RLS for every public application table and replaces the known app tables' policies with the rules below. Unknown public tables receive RLS but no new access policies.

| Data | Anonymous visitor | Signed-in user |
| --- | --- | --- |
| Classic jokes and caption text | Read | Read |
| Generation requests and full prompts | No access | Read own only |
| Profiles | No access | Read/create/update own only |
| Votes | No access to individual votes | Read own; insert one own vote per caption |
| Public scores | Read aggregates | Read aggregates and own vote |
| Creating AI captions | Not allowed | Owner-checked RPCs with quota enforcement |
| Profile photos | No access | Existing private Storage policies restrict access to the owner's folder |

No client can directly insert/update/delete captions or generation requests. The reservation/publish RPCs verify the signed-in user, enforce quotas, and atomically publish one caption per request. Database functions use an empty search path and explicit execution grants. The feed function returns aggregate votes while keeping voter identities and other users' full prompts private.

A first vote inserts a row into `votes` with `user_id`, `caption_id`, and `value` (+1 or -1). A primary key on `(user_id, caption_id)` prevents double votes, including double-clicks and concurrent submissions. There are no vote UPDATE or DELETE grants.

## 2. Create a Gemini API key

1. Open https://aistudio.google.com/apikey and sign in.
2. Create an API key in a Google AI Studio project available to your account.
3. In VS Code, add this line to `.env.local` beside the existing Supabase variables:

```dotenv
GEMINI_API_KEY=your-real-gemini-key
```

Do not add the real key to `.env.example`, GitHub, or client-side code. This key is separate from the Google OAuth client secret used for sign-in.

The app defaults to `gemini-3.5-flash`. If your project supports another model, set its API model ID as `GEMINI_MODEL`. Model availability and quota are determined by your Gemini account.

```dotenv
GEMINI_MODEL=gemini-3.5-flash
```

The exact prompt, model ID, scene, topic, tone, and request status are saved in `generation_requests`. The returned caption is saved in `captions`. Only genuine successful AI responses are published: missing keys, provider refusals, timeouts, malformed output, and quota errors never create fake captions.

## 3. Configure Vercel and OAuth

1. In your existing Vercel project's **Settings → Environment Variables**, add `GEMINI_API_KEY` for **Production** and **Preview**. Add `GEMINI_MODEL` only if overriding the default.
2. Keep the existing `SUPABASE_URL` and `SUPABASE_ANON_KEY` values.
3. Deploy the latest commit. If it deployed before the new variable was added, **Redeploy** after saving it.
4. Copy the new deployment's unique URL. The old Week 3 deployment cannot show Week 4 features.
5. In **Supabase → Authentication → URL Configuration → Redirect URLs**, add the exact new URL plus `/auth/callback`. Keep the callback path exact, with no custom query parameters.
6. If you configured Google Authorized JavaScript origins for individual deployments, add this new origin there too. Google's authorized redirect URI remains the existing Supabase `/auth/v1/callback` URL.
7. Keep **Vercel Deployment Protection** disabled so signed-out visitors and your PM can open the public feed in Incognito.

## 4. Verify the assignment

1. Open the new deployment URL in Incognito. The feed and daily scene must be public.
2. Visit `/create` directly while signed out. It must redirect to `/login`.
3. Sign in with Google. Open **Create**, edit the scene, choose a topic/tone, and click **Generate & publish caption**.
4. Confirm the generated caption appears at its detail URL. Under your own caption, expand **Your saved generation prompt** to see the exact prompt used.
5. In Supabase, verify a completed `generation_requests` row and a linked `captions` row exist.
6. Click **Funny** or **Pass**. Confirm the score changes and your selected vote stays selected after refreshing.
7. Verify a new row in `votes` contains your user ID, the correct caption ID, and the chosen value. Trying again must not insert another vote.
8. Sign in as another user in a different browser and rate the same caption. The total should include both votes, while each user sees only their own saved vote.
9. Use New, Today's best, Top all time, and topic filters. Copy a caption link and open it in Incognito; the same caption should load with a sign-in link for voting.
10. Sign out. The feed remains public; creating and voting require login.
11. Confirm all public tables have RLS enabled using the audit query below.
12. Complete the PM feedback session, record exact feedback in `PM_FEEDBACK.md`, implement the agreed changes, and deploy the final version.
13. Submit the final commit-specific URL tested in Incognito.

```sql
select schemaname, tablename, rowsecurity
from pg_tables where schemaname = 'public'
order by tablename;
```

## Local checks

With Node.js 22 LTS:

```sh
npm ci
npm test
npm run build
npm run dev
```

With the server running, in a second terminal:

```sh
npm run test:auth
```

The tests include a local PostgreSQL-compatible engine that applies the real SQL migrations and verifies RLS, spoofed-vote rejection, vote uniqueness, private prompts, owner-only mutations, and quota enforcement. AI unit tests use mocked provider responses; they do not prove that your Gemini key or deployed database is configured. Complete the real-generation and voting checks above.

## Troubleshooting

- **Feed could not load:** run `rating-setup.sql` in the same Supabase project used by Vercel, and confirm it completed successfully.
- **AI generation is not connected:** add `GEMINI_API_KEY` to Vercel, then redeploy. Local `.env.local` is not uploaded to Vercel.
- **AI quota error:** check your Gemini project's available quota and model access. An API key alone does not guarantee quota for every model.
- **Cannot start generation:** confirm the RPCs exist, the user is signed in, and the 10-attempt rolling limit has not been reached.
- **No captions yet:** create one with real AI. There is no hardcoded AI sample content in the feed.
- **Google returns to `/` with `?code=`:** add the current unique deployment's exact `/auth/callback` URL to Supabase's redirect allowlist, then start a fresh sign-in.

## References

- https://ai.google.dev/gemini-api/docs/generate-content/text-generation
- https://ai.google.dev/gemini-api/docs/generate-content/structured-output
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://vercel.com/docs/environment-variables
