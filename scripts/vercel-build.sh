#!/bin/sh
# Vercel runs this instead of `next build`. Production deployments apply
# pending migrations first, over the direct (unpooled) connection because
# `migrate deploy` takes advisory locks that PgBouncer does not support.
# Preview builds never touch a database. The shared CI also runs
# `vercel build --prod` on pushes to main as a compile check; GITHUB_ACTIONS
# is set only there, so it is skipped too.
set -e

if [ "$VERCEL_ENV" = "production" ] && [ -z "$GITHUB_ACTIONS" ]; then
  : "${DIRECT_URL:?DIRECT_URL is required to migrate the production database}"
  DATABASE_URL="$DIRECT_URL" prisma migrate deploy
fi

next build
