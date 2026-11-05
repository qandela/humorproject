# The Humor Project — Week 2: Connecting the Database

The existing Week 1 Next.js app now reads a public joke collection from Supabase and renders a responsive card list at `/`.

## 1. Create the database

1. Sign in at https://supabase.com/dashboard and create a project (or open your existing project).
2. Open **SQL Editor → New query**.
3. Paste the contents of [`supabase/setup.sql`](supabase/setup.sql) and click **Run**.
4. Open **Table Editor → jokes** and confirm the six seeded rows exist.

The SQL creates the table, enables Row Level Security, and grants anonymous visitors read-only access. It can be run again without duplicating the sample jokes. API writes are not allowed by this setup.

## 2. Configure local environment variables

Find the project URL and anon key in the project's **Connect** dialog or **Settings → API / API Keys**. A publishable key also works; do not use a service-role or secret key.

Copy `.env.example` to `.env.local` and replace its placeholders:

```dotenv
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

`.env.local` is ignored by Git. The application reads both values on the server; no project URL or API key is hardcoded.

Install Node.js 22 LTS, then run:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Restart the dev server after changing environment variables.

## How the database read works

- `src/lib/jokes.ts` queries Supabase's REST Data API at `/rest/v1/jokes`, selecting `id`, `category`, `setup`, and `punchline`, ordered by ID.
- `src/app/page.tsx` fetches and renders the records at request time inside a Suspense boundary. Requests are not cached, so refreshing after a database edit shows the new content.
- The page includes loading, missing-configuration, database-error, and empty-table states. It never substitutes hardcoded sample cards for failed database reads.
- Sample jokes live only in the SQL seed data. They appear on the page only after being retrieved from Supabase.

## Verify

```sh
npm test
npm run build
npm start
```

The tests cover successful reads, query options, missing configuration, empty rows, API failures, network failures, and malformed responses using a mock HTTP response. They do not verify your live Supabase project.

For live verification, load `/` with valid environment variables and confirm six joke cards appear. Change a punchline in Supabase's Table Editor, refresh the page, and verify the new text appears. This proves the page reads the database.

If the page shows a connection message, verify both environment variables, the project is active, and the SQL setup has run. If it shows no jokes, check that seed rows and the anonymous SELECT policy exist.

## Deploy and submit

1. Commit and push this app to https://github.com/qandela/humorproject.
2. Open the existing Vercel project connected to that repository.
3. Under **Settings → Environment Variables**, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` with the same values as `.env.local`. Enable them for **Production** and **Preview**.
4. Deploy the latest commit. If the commit deployed before you added variables, redeploy it after saving them.
5. Wait for **Ready**, visit the deployment, and confirm database rows appear.
6. Under **Settings → Deployment Protection**, disable Vercel Authentication and any other enabled protection, then save.
7. Under **Deployments**, select this successful deployment, verify its source commit, and copy its unique generated deployment URL. Avoid the production-domain or branch alias, which can later point to a different commit.
8. Open that exact URL in an Incognito/Private window and confirm the joke cards load without signing in.
9. Submit that URL in the course's **Submissions** section.

A build passing without credentials does not verify the database connection. Both rubric requirements require a real Supabase project and a publicly accessible Vercel deployment.

## Documentation

- https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- https://supabase.com/docs/guides/api
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://vercel.com/docs/environment-variables
- https://vercel.com/docs/deployments/generated-urls
- https://vercel.com/docs/deployment-protection
