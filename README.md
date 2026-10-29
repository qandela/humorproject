# Week 1: Hello World

A simple Next.js app created with `create-next-app`, using TypeScript and the App Router.

## Run locally

Install Node.js 22 LTS or a newer supported LTS version, then run:

```sh
npm install
npm run dev
```

Open http://localhost:3000. Edit `src/app/page.tsx` to change the greeting.

## Verify the production build

```sh
npm run build
npm start
```

## Assignment checklist

1. Create a GitHub repository. This checkout is connected to https://github.com/qandela/humorproject.
2. Clone the repository using IntelliJ's **Get from Version Control** action. If this checkout was cloned another way, clone it into a different folder using IntelliJ to complete that requirement.
3. Create the Next.js app using `create-next-app` (completed in this source).
4. Commit and push the app to GitHub.
5. In https://vercel.com/new, sign in with GitHub, import `qandela/humorproject`, leave the root directory at the repository root, and use the detected Next.js defaults. Click **Deploy**.
6. Wait for the deployment to report **Ready** and confirm the page displays **Hello World!**.
7. In the Vercel project's **Settings → Deployment Protection**, disable **Vercel Authentication** and any other enabled protection, then save.
8. Open the successful deployment's details and copy its unique generated deployment URL. Confirm its source commit matches the GitHub commit you intend to submit. Avoid the project domain and branch alias, which can point to newer deployments later.
9. Open that exact URL in an Incognito/Private window. Confirm it loads without signing in, then paste it into the course's **Submissions** section.

The submission must be the deployed page's URL, not a GitHub commit link or a Vercel dashboard link.

## References

- https://nextjs.org/docs/app/getting-started/installation
- https://vercel.com/docs/deployments/generated-urls
- https://vercel.com/docs/deployment-protection
