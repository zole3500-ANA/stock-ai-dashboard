#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${1:-}"
if [ -z "$REPO_URL" ]; then
  echo "Usage: ./scripts/push-to-github.sh https://github.com/OWNER/REPO.git"
  exit 1
fi

if [ ! -d .git ]; then
  git init
fi

git add .
git commit -m "Initial Stock AI Dashboard" || echo "No changes to commit"
git branch -M main
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

git push -u origin main
