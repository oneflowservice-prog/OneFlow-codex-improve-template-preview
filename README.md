


<p align="center">
  AI app builder built with Next.js, Prisma, and hosted model integrations.
</p>

## Tech stack

- Llama 3.1 from Meta for the LLM
- [Together AI](https://togetherai.link/?utm_source=llamacoder&utm_medium=referral&utm_campaign=example-app) for LLM inference
- [Sandpack](https://sandpack.codesandbox.io/) for the CodeSandbox preview path
- [E2B](https://e2b.dev/docs) for managed cloud previews
- Next.js app router with Tailwind
- Helicone for observability
- Plausible for website analytics

## Installation

1. Extract or clone the project files.
2. Copy `.example.env` to `.env`.
3. Fill in the environment variables required for the features you plan to use.
4. Install dependencies with `npm install`.
5. Run database migrations with `npm run migrate:deploy`.
6. Start the local server with `npm run dev`.

## Required and optional environment variables

- Required core setup: `TOGETHER_API_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`
- Optional model and preview services: `MODELSLAB_API_KEY`, `CSB_API_KEY`, `DAYTONA_*`, `BUNNY_*`, `MICROLINK_API_KEY`, `NEXT_PUBLIC_SANDPACK_*`
- Optional analytics and observability: `HELICONE_API_KEY`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
- Optional deployment integrations: `NETLIFY_CLIENT_ID`, `VERCEL_CLIENT_ID`, `VERCEL_CLIENT_SECRET`, `NEXT_PUBLIC_VERCEL_APP_CLIENT_ID`, `VERCEL_APP_CLIENT_SECRET`
- Optional billing: `STRIPE_*`, `SUBSCRIPTION_REWARD_CRON_SECRET`

See [documentation/index.html](./documentation/index.html) and [.example.env](./.example.env) for the full setup guide.

## Asset notes

- The package includes `Aeonik` font files under `public/Aeonik/`.
- Confirm you have the right to redistribute these font files with your marketplace package before publishing.
- If your license does not allow redistribution, replace them with properly licensed alternatives before listing the item.

## Contributing

For contributing to the repo, please see the [contributing guide](./CONTRIBUTING.md)



