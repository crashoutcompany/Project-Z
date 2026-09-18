# Project Z — AI agent guidelines

Self-hosted Better Auth. Users live in this app's Neon database.

## How agents sign in

- Build and start with `EXPOSE_TESTING_API=1`. Never set that flag on Vercel Production.
- Set `TEST_AUTH_SECRET` and `POST /api/test-auth/login` with header
  `x-test-auth-secret: <secret>`.
- The route upserts the seeded tester and mints a real Better Auth session cookie.
  Production always 404s; a wrong secret returns 401.
- Playwright `e2e/global-setup.ts` performs that POST and writes
  `e2e/.auth/tester.json`. Specs opt in with `test.use({ storageState })`.
- If Deployment Protection is on, also send
  `x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET`.

## Neon Managed Better Auth revisit

Revisit Neon Managed Better Auth only after all of: GA; SDK ≥1.0 with a changelog;
documented http-dev cookie story or configurable cookie names; API to seed a tester
per branch. Users already live in this Neon database, so a later switch is a schema
move, not a rewrite.
