#!/usr/bin/env bash
# One-time, idempotent environment setup for the Cloud Agent.
#
# Prepares a fully local, no-cloud-credentials development stack:
#   - Node dependencies + generated Prisma client
#   - A native PostgreSQL server
#   - A local Neon-compatible proxy (see neon-local-proxy.mjs) so the app's
#     @neondatabase/serverless driver works unchanged against local Postgres
#   - Full schema + seed data
#
# Safe to run repeatedly. Run from the repository root.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEV_DIR="$REPO_ROOT/.cursor/dev"
CERT_DIR="$DEV_DIR/certs"
cd "$REPO_ROOT"

echo "==> [1/8] Ensuring local .env exists"
if [ ! -f "$REPO_ROOT/.env" ]; then
  cat > "$REPO_ROOT/.env" <<'ENV'
# Local development environment (gitignored). Not for production.
# Postgres runs natively on the VM; the @neondatabase/serverless driver talks to
# a local Neon-compatible proxy on :443 for host db.localtest.me (-> 127.0.0.1).
DATABASE_URL="postgresql://pocket:pocket@db.localtest.me:5432/pocket?sslmode=disable"
DIRECT_URL="postgresql://pocket:pocket@db.localtest.me:5432/pocket?sslmode=disable"

AUTH_SECRET="dev-secret-please-change-0123456789abcdef0123456789abcdef"

# OAuth providers require real external apps; placeholders let the app boot.
# Real Google/GitHub sign-in needs valid credentials (see README / secrets).
AUTH_GITHUB_ID="dev-github-id"
AUTH_GITHUB_SECRET="dev-github-secret"
AUTH_GOOGLE_ID="dev-google-id"
AUTH_GOOGLE_SECRET="dev-google-secret"
ENV
  echo "    wrote $REPO_ROOT/.env"
else
  echo "    .env already present, leaving as-is"
fi

echo "==> [2/8] Ensuring hostname aliases in /etc/hosts"
# The Neon driver derives its HTTP endpoint by replacing the first host label
# with 'api', so db.localtest.me -> api.localtest.me for POST /sql.
for h in db.localtest.me api.localtest.me apiauth.localtest.me; do
  grep -qE "^127\.0\.0\.1[[:space:]]+$h(\$|[[:space:]])" /etc/hosts || \
    echo "127.0.0.1 $h" | sudo tee -a /etc/hosts >/dev/null
done

echo "==> [3/8] Installing PostgreSQL (if missing)"
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib
fi
PG_VERSION="$(ls /etc/postgresql | sort -n | tail -1)"
echo "    PostgreSQL major version: $PG_VERSION"

echo "==> [4/8] Configuring Postgres auth + starting the cluster"
HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
# The Neon driver pipelines a cleartext password (pipelineConnect: "password"),
# so local TCP connections must use the 'password' auth method. Postgres still
# validates it against the SCRAM-hashed stored secret.
sudo sed -i -E 's#^(host[[:space:]]+all[[:space:]]+all[[:space:]]+127\.0\.0\.1/32[[:space:]]+).*#\1password#' "$HBA"
sudo sed -i -E 's#^(host[[:space:]]+all[[:space:]]+all[[:space:]]+::1/128[[:space:]]+).*#\1password#' "$HBA"
sudo pg_ctlcluster "$PG_VERSION" main start 2>/dev/null || true
# Wait for readiness.
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q 2>/dev/null; then break; fi
  sleep 1
done
sudo pg_ctlcluster "$PG_VERSION" main reload 2>/dev/null || true

echo "==> [5/8] Creating role + database (if missing)"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='pocket') THEN
    CREATE ROLE pocket LOGIN PASSWORD 'pocket';
  END IF;
END $$;
SQL
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='pocket'" | grep -q 1 || \
  sudo -u postgres createdb -O pocket pocket
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE pocket TO pocket;" >/dev/null

echo "==> [6/8] Generating local TLS certificates (if missing)"
if [ ! -f "$CERT_DIR/ca.crt" ] || [ ! -f "$CERT_DIR/server.crt" ]; then
  mkdir -p "$CERT_DIR"
  (
    cd "$CERT_DIR"
    openssl genrsa -out ca.key 2048 2>/dev/null
    openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
      -subj "/CN=Pocket Local Dev CA" -out ca.crt 2>/dev/null
    openssl genrsa -out server.key 2048 2>/dev/null
    openssl req -new -key server.key -subj "/CN=db.localtest.me" -out server.csr 2>/dev/null
    cat > server.ext <<'EXT'
subjectAltName = DNS:db.localtest.me, DNS:api.localtest.me, DNS:apiauth.localtest.me, DNS:localhost, IP:127.0.0.1
EXT
    openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
      -out server.crt -days 3650 -sha256 -extfile server.ext 2>/dev/null
  )
  echo "    generated CA + server certificate"
else
  echo "    certificates already present"
fi

echo "==> [7/8] Installing dependencies (app + proxy)"
pnpm install --frozen-lockfile
( cd "$DEV_DIR" && pnpm install )

echo "==> [8/8] Syncing schema + seeding data"
export NODE_EXTRA_CA_CERTS="$CERT_DIR/ca.crt"
# db push creates every table in schema.prisma, including the Better Auth tables
# that the committed migrations do not yet cover.
pnpm exec prisma db push
# Seeding uses the Neon driver, so bring the proxy up briefly.
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=443 >/dev/null
node "$DEV_DIR/neon-local-proxy.mjs" >/tmp/neon-proxy-seed.log 2>&1 &
PROXY_PID=$!
trap 'kill "$PROXY_PID" 2>/dev/null || true' EXIT
for _ in $(seq 1 20); do
  curl -sf --cacert "$CERT_DIR/ca.crt" https://db.localtest.me/health >/dev/null 2>&1 && break
  sleep 0.5
done
pnpm exec prisma db seed
kill "$PROXY_PID" 2>/dev/null || true
trap - EXIT

echo "==> Environment install complete."
