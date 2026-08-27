#!/usr/bin/env bash
# Mint a valid Better Auth session for local testing WITHOUT OAuth.
#
# Creates (or replaces) a dev user + session row directly in Postgres and prints
# a signed `better-auth.session_token` cookie. Useful for exercising pages gated
# by proxy.ts (e.g. /dex, /collections) when real Google/GitHub OAuth apps are
# not configured. Dev-only.
#
# Usage:
#   bash .cursor/dev/make-dev-session.sh
#   curl -H "Cookie: $(bash .cursor/dev/make-dev-session.sh)" http://localhost:3000/dex
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

EMAIL="${DEV_SESSION_EMAIL:-dev@example.com}"
TOKEN="devsession$(openssl rand -hex 16)"
UID_="devuser$(openssl rand -hex 8)"
SID="devsess$(openssl rand -hex 8)"

PGPASSWORD=pocket psql -h 127.0.0.1 -U pocket -d pocket -v ON_ERROR_STOP=1 >/dev/null <<SQL
DELETE FROM "Session" s USING "User" u WHERE s."userId"=u.id AND u.email='${EMAIL}';
DELETE FROM "User" WHERE email='${EMAIL}';
INSERT INTO "User" (id,name,email,"emailVerified","createdAt","updatedAt")
  VALUES ('${UID_}','Dev Tester','${EMAIL}',true,now(),now());
INSERT INTO "Session" (id,"expiresAt",token,"createdAt","updatedAt","userId")
  VALUES ('${SID}', now()+interval '30 days','${TOKEN}',now(),now(),'${UID_}');
SQL

# Sign the token exactly like better-call: base64(HMAC-SHA256(token, secret)),
# joined as `token.signature`, then URL-encoded.
node -e '
const c=require("crypto"),fs=require("fs");
const env=fs.readFileSync(".env","utf8");
const secret=(env.match(/AUTH_SECRET="?([^"\n]+)"?/)||[])[1];
if(!secret){console.error("AUTH_SECRET not found in .env");process.exit(1);}
const t=process.argv[1];
const sig=c.createHmac("sha256",secret).update(t).digest("base64");
process.stdout.write("better-auth.session_token="+encodeURIComponent(t+"."+sig)+"\n");
' "$TOKEN"
