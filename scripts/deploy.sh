#!/usr/bin/env bash
# Deploy CRM-AI to Cloudflare Workers.
#
#   ./scripts/deploy.sh            # both services, production
#   ./scripts/deploy.sh api        # backend only
#   ./scripts/deploy.sh web        # frontend only
#   ENV=staging ./scripts/deploy.sh
#
# Run scripts/setup-cloudflare.sh once first.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-all}"
ENV="${ENV:-production}"

# Wrangler treats an empty --env as "the top-level environment".
if [ "$ENV" = "production" ]; then
  ENV_FLAG=(--env "")
  API_WORKER="crm-ai-api"
  WEB_WORKER="crm-ai-web"
else
  ENV_FLAG=(--env "$ENV")
  API_WORKER="crm-ai-api-$ENV"
  WEB_WORKER="crm-ai-web-$ENV"
fi

step() { printf '\n\033[1;36m▸ %s\033[0m\n' "$1"; }
fail() { printf '\033[1;31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

command -v npx >/dev/null || fail "npx not found — install Node.js 20+"

deploy_api() {
  step "Backend → $API_WORKER"
  cd "$ROOT/backend"

  npx tsc --noEmit

  step "Applying database migrations"
  [ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL is not set — export the Neon connection string"
  npx prisma migrate deploy

  npx wrangler deploy "${ENV_FLAG[@]}"
}

deploy_web() {
  step "Frontend → $WEB_WORKER"
  cd "$ROOT/frontend"

  # NEXT_PUBLIC_* is inlined at build time, so the API origin must be present
  # now — setting it only in wrangler vars would ship the placeholder.
  [ -n "${NEXT_PUBLIC_API_URL:-}" ] || \
    fail "NEXT_PUBLIC_API_URL is not set — export the API origin (e.g. https://api.yourdomain.com)"
  echo "  API origin: $NEXT_PUBLIC_API_URL"

  npx opennextjs-cloudflare build
  npx wrangler deploy "${ENV_FLAG[@]}"
}

case "$TARGET" in
  api|backend) deploy_api ;;
  web|frontend) deploy_web ;;
  all)
    deploy_api
    deploy_web
    ;;
  *) fail "Unknown target '$TARGET' — use: api | web | all" ;;
esac

step "Done"
echo "  API:  https://$API_WORKER.workers.dev/health"
echo "  Web:  https://$WEB_WORKER.workers.dev"
echo
echo "  Logs: cd backend && npx wrangler tail ${ENV_FLAG[*]}"
