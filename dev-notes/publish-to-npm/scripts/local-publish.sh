#!/usr/bin/env bash
# One-time / rare MANUAL publish from the host.
#
# Uses nvm to MOMENTARILY switch to Node >= 22.14 / npm >= 11.5.1 for this command
# only — your default Node version is left unchanged. Release tooling stays in the
# repo's node_modules (devDependency), nothing is installed globally on the host.
#
# Routine releases are automated in CI (semantic-release on merge to main); use this
# script only for the first publish or rare manual releases.
#
# Usage:
#   local-publish.sh                 # build + publish (prompts for the npm 2FA OTP if needed)
#   local-publish.sh --otp 123456    # build + publish with a one-time password
#   local-publish.sh --dry-run       # build + npm pack (no publish)
set -euo pipefail

DRY_RUN=0
OTP="${NPM_OTP:-}"
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --otp) shift; OTP="${1:-}" ;;
    --otp=*) OTP="${1#--otp=}" ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

# repo root = three levels up from dev-notes/publish-to-npm/scripts/
cd "$(dirname "$0")/../../.."

# --- Momentary Node switch via nvm (does not change your default Node) ---
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "nvm not found at $NVM_DIR — install nvm, or switch to Node >= 22.14 manually." >&2
  exit 1
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm use 24 >/dev/null || { echo "Node 24 not installed — run 'nvm install 24'." >&2; exit 1; }
echo "Using node $(node -v) / npm $(npm -v)  (momentary; your default Node is unchanged)"

npm run build:plugin

if [ "$DRY_RUN" -eq 1 ]; then
  echo "[--dry-run] packing instead of publishing:"
  npm pack --workspace=vite-plugin-flatwave-react --dry-run
  exit 0
fi

PUBLISH_ARGS=(--workspace vite-plugin-flatwave-react --access public)

if [ -n "${NODE_AUTH_TOKEN:-}" ]; then
  # Granular access token with "bypass 2FA" -> authenticates with NO OTP.
  # Write a temp npmrc that REFERENCES the env var, so the token is never written to disk.
  TMP_NPMRC="$(mktemp)"
  trap 'rm -f "$TMP_NPMRC"' EXIT
  printf '//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}\n' > "$TMP_NPMRC"
  PUBLISH_ARGS+=(--userconfig "$TMP_NPMRC")
  echo "Authenticating with NODE_AUTH_TOKEN (bypass-2FA token); no OTP needed."
else
  # Otherwise use your logged-in account + a 2FA one-time password (a 6-digit code, NOT a token).
  npm whoami >/dev/null 2>&1 || npm login
  if [ -z "$OTP" ] && [ -t 0 ]; then
    printf 'npm one-time password (6-digit code from your authenticator): '
    read -r OTP
  fi
  [ -n "$OTP" ] && PUBLISH_ARGS+=(--otp "$OTP")
fi

# Provenance can only be generated from CI, so a local publish omits it; CI adds it later.
npm publish "${PUBLISH_ARGS[@]}"
echo "Published. Verify: npm view vite-plugin-flatwave-react version"
