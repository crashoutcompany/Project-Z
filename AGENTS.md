# Project Z — AI agent guidelines

Self-hosted Better Auth. Users live in this app's Neon database.

## How agents sign in

- Build and start with `EXPOSE_TESTING_API=1`. Never set that flag on Vercel
  Production (and never rely on `NODE_ENV` / `VERCEL_ENV` alone — RDC-strict).
- Set `TEST_AUTH_SECRET` and `POST /api/test-auth/login` with header
  `x-test-auth-secret: <secret>`.
- The route upserts the seeded tester and mints a real Better Auth session cookie.
  Disabled environments always 404; a wrong secret returns 401.
- Playwright `e2e/global-setup.ts` performs that POST and writes
  `e2e/.auth/tester.json`. Specs opt in with `test.use({ storageState })`.
- If Deployment Protection is on, also send
  `x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET`.

## Env lock (auth)

Required names — do **not** use `AUTH_URL` / `AUTH_SECRET`:

| Name | Where |
|------|--------|
| `BETTER_AUTH_SECRET` | local, Vercel (CI uses a fixture for e2e and pulls Vercel env for build) |
| `BETTER_AUTH_URL` | Vercel / local when OAuth callback origin must be explicit |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Vercel + OAuth console |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | Vercel + OAuth console (optional provider) |
| `TEST_AUTH_SECRET` | local / Cursor Cloud Agents (`x-test-auth-secret`; CI e2e uses a fixture) |
| `EXPOSE_TESTING_API=1` | local, Cursor Cloud Agents, CI e2e builds only |

## Ops checklist (CI / OAuth)

- [ ] CI runs the shared workflow in `crashoutcompany/.github`. Auth secrets are not needed in GitHub Actions: lint/test/e2e use fixtures and the build pulls Vercel env.
- [ ] GitHub Actions secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `NEON_API_KEY`, plus `NEON_PROJECT_ID` (variable or secret). Neon database/role default to `neondb` (where `User` / Prisma tables live) and `neondb_owner`; leave `NEON_DATABASE` / `NEON_ROLE` unset. The extra `ptcgp` database on this project is empty — do not point CI at it.
- [ ] Vercel env: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (prod + preview strategy), OAuth IDs/secrets
- [ ] Google/GitHub OAuth redirect URIs include prod + `*.vercel.app` preview callbacks for `/api/auth/callback/*`

## Neon Managed Better Auth revisit

Revisit Neon Managed Better Auth only after all of: GA; SDK ≥1.0 with a changelog;
documented http-dev cookie story or configurable cookie names; API to seed a tester
per branch. Users already live in this Neon database, so a later switch is a schema
move, not a rewrite.
