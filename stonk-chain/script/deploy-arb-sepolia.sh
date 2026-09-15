#!/usr/bin/env bash
# One-shot deploy helper for Arbitrum Sepolia.
# Requires foundry + a funded DEPLOYER_PK in .env.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -f .env ]]; then
    echo "Missing .env — cp .env.example .env and fill in the required fields"
    exit 1
fi
set -a
# shellcheck disable=SC1091
source .env
set +a

: "${DEPLOYER_PK:?DEPLOYER_PK not set}"
: "${STONK_ADMIN:?STONK_ADMIN not set}"
: "${ARB_SEPOLIA_RPC:?ARB_SEPOLIA_RPC not set}"

echo "==> Building contracts"
forge build --sizes

echo "==> Running tests before deploy"
forge test

echo "==> Deploying to Arb Sepolia"
forge script script/DeployCore.s.sol \
    --rpc-url "$ARB_SEPOLIA_RPC" \
    --private-key "$DEPLOYER_PK" \
    --broadcast \
    --slow \
    -vv | tee deploy.log

echo ""
echo "==> Deploy complete. Addresses:"
grep -E '^  (Stonk|Multiplier|Portfolio|Session|Lighter|Usdg)' deploy.log || true

echo ""
echo "==> Next steps:"
echo "  1. Copy addresses into frontend/.env.local (NEXT_PUBLIC_*)"
echo "  2. Copy the same addresses into keeper/.env (BRIDGE_ADDRESS, PAYMASTER_ADDRESS)"
echo "  3. cd frontend && npm run build && vercel --prod"
echo "  4. cd keeper && npm run build && node dist/index.js  (or supervise with pm2/systemd)"
