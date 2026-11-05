# Week 3 — Google sign-in, profiles, and a gated route

Continue with the same GitHub repository, Supabase project, and Vercel project as Week 2.

## What the app does

- `/` stays public and lists jokes from Supabase.
- `/login` offers Google sign-in using Supabase's cookie-based PKCE flow.
- The OAuth redirect target is exactly the current origin plus `/auth/callback`. The app does not add `next` or other custom query parameters. Supabase adds its normal authorization `code` during the return trip.
- `/auth/callback` exchanges that code for a session and sends the user to `/profile`.
- `/members` and `/profile` validate the user on the server. Signed-out visitors are redirected to `/login`.
- `/profile` edits nullable first/last names and uploads JPEG, PNG, or WebP photos up to 2 MB. Photos are stored in a private Storage bucket; the database stores only the file path. Signed URLs display the current user's photo.
- Session cookies refresh in Next.js Proxy. Protected pages and profile actions also validate the user independently; hiding navigation alone does not protect a route.

## 1. Run the SQL in your existing Supabase project

1. Open https://supabase.com/dashboard and select your Week 2 project.
2. Open **SQL Editor → New query**.
3. Paste all of [`supabase/auth-setup.sql`](supabase/auth-setup.sql) and click **Run**.
4. Confirm **Table Editor → profiles** exists. It may have zero rows until the first signup.
5. Under **Storage**, confirm a private bucket named `avatars` exists.

The SQL creates nullable `first_name` and `last_name` fields, an `auth.users` signup trigger, and owner-only profile/storage policies. It also backfills any existing users and can be rerun without duplicate profiles. Keep these policies enabled.

## 2. Create your own Google OAuth client

1. Open https://console.cloud.google.com/ and create or select a project named **Humor Project**.
2. Open **Google Auth Platform**. If prompted, click **Get started** and configure your app name, support email, and developer contact email.
3. Set the audience to **External**, so accounts outside your organization can sign in.
4. Under **Data Access**, configure the basic `openid`, `userinfo.email`, and `userinfo.profile` scopes.
5. Open **Clients → Create client → Web application**. Name it **Humor Project Web**.
6. Under **Authorized JavaScript origins**, add your Vercel production origin, such as `https://your-project.vercel.app`. Add `http://localhost:3000` for local testing.
7. In Supabase, open **Authentication → Sign In / Providers → Google** and copy its **Callback URL**. It looks like `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`.
8. Paste that Supabase URL into Google's **Authorized redirect URIs**. Create the client and save its **Client ID** and **Client secret**.
9. Return to the Supabase Google provider page. Enable Google, enter your Client ID and Client secret, and save. Leave nonce verification enabled.

**Two callbacks are involved:** Google redirects to Supabase's `/auth/v1/callback`; Supabase redirects to your app's `/auth/callback`. Use the appropriate URL in each dashboard. Do not put the app callback in Google's redirect URI field when using this Supabase flow.

While Google's app is in **Testing**, only the test users you add under **Audience** can sign in. To allow an instructor to sign in with their own Google account, use **Audience → Publish app** when your setup is ready. Follow any Google verification requirements shown in your account.

## 3. Allow your app callback in Supabase

1. Under **Authentication → URL Configuration**, set **Site URL** to your Vercel production origin.
2. Add these **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR-PRODUCTION-DOMAIN/auth/callback`
   - `https://YOUR-COMMIT-SPECIFIC-DEPLOYMENT.vercel.app/auth/callback`
3. Save. Add the exact unique deployment callback after Vercel creates that deployment. No extra query parameters are needed.

For Google sign-in on the unique deployment, also add its origin (no path) to the Google OAuth client's **Authorized JavaScript origins**.

## 4. Environment variables and deployment

The app reuses Week 2's existing variables, both locally in `.env.local` and in Vercel:

```dotenv
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_ANON_KEY=YOUR-ANON-OR-PUBLISHABLE-KEY
```

No new browser environment variables are needed because sign-in starts in a Server Action. The Google client secret belongs in Supabase's provider settings, not GitHub or the app.

Commit and push the changes to the existing repository. Vercel should deploy the connected repository automatically. Wait for **Ready**, add the resulting unique callback URL to Supabase as described above, and test that deployment. If deployment fails, inspect its build logs.

## 5. Test before submitting

1. In an Incognito/Private window, open the unique deployment URL. The public joke collection should load without a Vercel login.
2. Visit `/members` directly. It must redirect to `/login` and not show the signed-in lounge content.
3. Click **Continue with Google** and complete sign-in. You should return through `/auth/callback` to `/profile`.
4. Verify a row appears in Supabase's `profiles` table with the same ID as the user under **Authentication → Users**.
5. Save a first name, last name, and photo. Refresh and confirm they persist. Clear both names and save to verify they are optional.
6. Visit `/members` again. It should now show the signed-in lounge.
7. Sign out, then revisit `/members` and `/profile` directly. Both must require login again.
8. Disable **Vercel Settings → Deployment Protection → Vercel Authentication**, and any other enabled deployment protection.
9. Submit the tested commit-specific deployment URL. Keep Vercel protection off: the app's own login protects only the member routes.

## Local checks

Use Node.js 22 LTS, then run:

```sh
npm ci
npm test
npm run build
npm run dev
```

With that local server running, use a second terminal:

```sh
npm run test:auth
```

This checks anonymous access, protected-route redirects, callback handling, and the OAuth redirect/PKCE cookie without completing Google sign-in.

The unit tests check data reads and profile input validation. A successful build and anonymous-route smoke test do not verify the live Google consent flow or database migration. Complete the manual end-to-end checks above after setting up your accounts.

## Troubleshooting

- **Google provider is not enabled:** save the Google client credentials in your existing Supabase project's Google provider settings.
- **redirect_uri_mismatch:** Google's redirect URI must exactly match the Supabase callback shown in the provider settings.
- **Returned to the wrong domain:** allow the exact deployment origin plus `/auth/callback` in Supabase. Start login and finish it on the same deployment domain so the PKCE cookie is available.
- **Access blocked / test user only:** add your account to Google's test users while testing; publish the OAuth app for other users before submission.
- **Database error saving new user:** run the SQL migration and check the trigger/function in Supabase; a broken signup trigger can block sign-in.
- **Profile or upload fails:** confirm the `profiles` table, private `avatars` bucket, and policies were created by the SQL file.

## References

- Required viewing: https://youtu.be/996OiexHze0
- https://supabase.com/docs/guides/auth/server-side/nextjs
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/managing-user-data
- https://supabase.com/docs/guides/storage/security/access-control
