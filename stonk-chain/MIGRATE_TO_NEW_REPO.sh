#!/usr/bin/env bash
# One-shot migration: extract stonk-chain/ into its own dedicated GitHub repo.
#
# Usage:
#   1. Create an empty repo on GitHub (public, no README):
#        https://github.com/new  →  Name: stonk-chain
#   2. Set the env var below to your new repo's SSH or HTTPS URL.
#   3. Run this script from anywhere.
#
# Requirements: git 2.30+, gh CLI (optional, only if you want to auto-verify).

set -euo pipefail

# ============ EDIT THIS ============
NEW_REPO_URL="${NEW_REPO_URL:-git@github.com:YOUR_USERNAME/stonk-chain.git}"
# ==================================

WORKDIR="$(mktemp -d)"
echo "Working in $WORKDIR"

# Clone the parent repo (branch containing stonk-chain/).
git clone --branch cursor/stonk-chain-mvp-00db \
  https://github.com/lanqi0518-ux/brain.git "$WORKDIR/brain"

cd "$WORKDIR/brain"

# Rewrite history so only files under stonk-chain/ remain, and lift them to root.
# git filter-repo is the modern, safe replacement for filter-branch. Install
# via `pip install git-filter-repo` if you don't have it.
if ! command -v git-filter-repo >/dev/null; then
  echo "Installing git-filter-repo..."
  pip install --user git-filter-repo
  export PATH="$HOME/.local/bin:$PATH"
fi

git filter-repo --subdirectory-filter stonk-chain --force

# Point at the new remote and push.
git remote remove origin || true
git remote add origin "$NEW_REPO_URL"
git branch -M main
git push -u origin main

echo ""
echo "✅ Done. Your dedicated stonk-chain repo now lives at:"
echo "   $NEW_REPO_URL"
echo ""
echo "You can now delete the stonk-chain/ folder from the brain repo if you want."
