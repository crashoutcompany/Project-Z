# Pokemon Pocket TCG Trading Hub

This is a [Next.js](https://nextjs.org) project designed to provide a hub for trading for the popular phone game Pokemon Pocket TCG. Users can view the Pokedex for each set and configure their trades to share with other users.

## Features

- **Pokedex Viewer**: Explore the Pokedex for each set of cards.
- **Trade Configuration**: Configure and share your trades with other users.
- **User-Friendly Interface**: Intuitive design for seamless navigation.

## Getting Started

Install Node.js 24 and pnpm 10, then run:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Card data and images

Factual card data is imported from community sources ([collection-tracker](https://github.com/marcelpanse/tcg-pocket-collection-tracker) and Limitless TCG). Card art is copied from Limitless into **Vercel Blob** at import time and served from Blob via `next/image`. Limitless is not used as a runtime image CDN.

If Blob or Image Optimization cost becomes a problem, the same pathnames can move to Cloudflare R2 without a schema change (see `.agents/DECK_BUILDER_SPEC.md`).

## Authentication and browser testing

Authentication is self-hosted with Better Auth. Sign-in lives at `/signin`.

- `BETTER_AUTH_SECRET` is required. `BETTER_AUTH_URL` may override the
  deployment URL.
- GitHub uses `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`; Google uses
  `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. A provider is enabled only when
  both values are set.
- Prisma uses `DATABASE_URL` and `DIRECT_URL`.

Local browser automation can mint a real Better Auth session for the tester
account. Set `EXPOSE_TESTING_API=1` and `TEST_AUTH_SECRET`, then `POST
/api/test-auth/login` with that secret in the `x-test-auth-secret` header. The
same secret-gated route may be enabled in Vercel Preview or Development, but is
always unavailable in Production. Disabled environments and `GET` return 404.
A wrong header returns 401.

Playwright uses `PLAYWRIGHT_BASE_URL` when supplied and otherwise starts the app
at `http://127.0.0.1:3000`. For protected Vercel deployments,
`VERCEL_AUTOMATION_BYPASS_SECRET` is forwarded as the protection bypass header.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
