#!/usr/bin/env bash
# One-time Cloudflare setup for CRM-AI.
#
#   ./scripts/setup-cloudflare.sh
#
# Creates the R2 buckets and walks through the secrets both Workers need.
# Safe to re-run: existing buckets are left alone and any secret can be skipped.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV="${ENV:-production}"

if [ "$ENV" = "production" ]; then
  ENV_FLAG=(--env "")
  CACHE_BUCKET="crm-ai-web-cache"
  UPLOAD_BUCKET="crm-ai-attachments"
else
  ENV_FLAG=(--env "$ENV")
  CACHE_BUCKET="crm-ai-web-$ENV-cache"
  UPLOAD_BUCKET="crm-ai-attachments-$ENV"
fi

step() { printf '\n\033[1;36m▸ %s\033[0m\n' "$1"; }
note() { printf '  \033[2m%s\033[0m\n' "$1"; }

step "Checking Cloudflare login"
cd "$ROOT/frontend"
npx wrangler whoami || {
  echo "Not logged in — running: wrangler login"
  npx wrangler login
}

step "Creating R2 buckets"
for bucket in "$CACHE_BUCKET" "$UPLOAD_BUCKET"; do
  echo "  $bucket"
  npx wrangler r2 bucket create "$bucket" 2>&1 | grep -v "already exists" || \
    note "already exists — skipping"
done

step "Backend secrets"
cd "$ROOT/backend"
note "Leave a prompt blank or answer N to skip a secret."

# DATABASE_URL should be the Neon *pooled* connection string.
REQUIRED_SECRETS=(
  DATABASE_URL
  JWT_SECRET
  ANTHROPIC_API_KEY
)
OPTIONAL_SECRETS=(
  RESEND_API_KEY
  INBOUND_WEBHOOK_SECRET
)

put_secret() {
  local name="$1" required="$2"
  printf '\n  %s%s\n' "$name" "$([ "$required" = "yes" ] && echo ' (required)' || echo ' (optional)')"
  read -r -p "    Set now? [y/N] " answer
  if [[ "$answer" =~ ^[Yy]$ ]]; then
    npx wrangler secret put "$name" "${ENV_FLAG[@]}"
  else
    note "skipped"
  fi
}

for s in "${REQUIRED_SECRETS[@]}"; do put_secret "$s" yes; done
for s in "${OPTIONAL_SECRETS[@]}"; do put_secret "$s" no; done

step "Next steps"
cat <<'EOF'
  1. Update the origins in both wrangler.jsonc files:
       backend/wrangler.jsonc   → vars.FRONTEND_URL, vars.PUBLIC_API_URL
       frontend/wrangler.jsonc  → vars.NEXT_PUBLIC_API_URL
     These must be the real deployed URLs — CORS and the email tracking pixel
     both depend on them.

  2. Apply the database schema to Neon:
       cd backend
       export DATABASE_URL='postgresql://...'   # pooled Neon URL
       npx prisma migrate deploy

  3. Deploy:
       export NEXT_PUBLIC_API_URL='https://api.yourdomain.com'
       ./scripts/deploy.sh

  4. Email sending uses Resend (https://resend.com) over HTTPS — SMTP cannot
     work on Workers. Set RESEND_API_KEY and verify your sending domain, then
     point EMAIL_FROM at an address on it.

  5. For inbound reply tracking, point your provider's inbound parse at:
       https://<your-api-domain>/api/webhooks/inbound-email
     sending the shared secret in the x-webhook-secret header.
EOF
