#!/usr/bin/env bash
# Local dry-run of the release pipeline — NO publish, NO push.
# Uses nvm to MOMENTARILY switch to Node >= 22.14 (npm >= 11.5.1) for this command
# only; your default Node is unchanged. On a non-`main` branch, semantic-release
# only validates config/plugins and reports it won't publish — that is expected.
set -euo pipefail

# repo root = three levels up from dev-notes/publish-to-npm/scripts/
cd "$(dirname "$0")/../../.."

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use 24 >/dev/null || true
fi
echo "node: $(node -v)  npm: $(npm -v)"

# @semantic-release/github needs a token even in dry-run (verifyConditions).
export GH_TOKEN="${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}"

npm run build:plugin
npx --no-install semantic-release --dry-run --no-ci
