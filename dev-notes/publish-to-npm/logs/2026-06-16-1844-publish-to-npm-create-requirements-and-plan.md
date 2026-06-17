# 2026-06-16 18:44 -05 — publish-to-npm — create requirements and plan

## What was done

- Created the feature folder `dev-notes/publish-to-npm/` with `plans/`, `logs/`, `scripts/`.
- Wrote the improved requirements: `dev-notes/publish-to-npm/publish-to-npm.md`.
- Wrote the technical plan: `dev-notes/publish-to-npm/plans/0001-conventional-commits-oidc-autopublish.md`.

## Why

- Refines the high-level ask ("publish the plugin to npm automatically on every PR merge to
  `main`") into a tracked story per the kamanes working agreement (requirements → plan →
  logs, no code before an approved plan).

## Decisions captured (from developer)

- Docs in `docs/` confirmed up to date (Step 0.1) — proceed.
- Versioning: **Conventional Commits** (`fix`→patch, `feat`→minor, breaking→major).
- Auth: **npm Trusted Publishing (OIDC)**, tokenless.
- Provenance: keep enabled.

## Session/tooling notes (Step 0.2)

- No persistent-memory or vector-index MCP active (only Context7 + GitHub MCP). Using
  built-in workspace search; the feature-folder markdown is the single source of truth.

## Current-state findings (research, 2026-06-16)

- `release.yml` already exists on `main`: patch-only bump + token auth — to be replaced.
- `scripts/bump-patch-version.js` exists — to be removed.
- Plugin `package.json` already has `publishConfig.access=public` + `provenance=true`.
- Package not yet on npm (404; name available). Repo public; default branch `main`; no
  branch protection. `NPM_TOKEN` secret presence unconfirmed. Build + `npm pack` verified OK.

## Deviations from plan

- None yet (no implementation started).

## State

- **Blocked — awaiting plan approval.** Per AGENTS.md, no code will be written until the
  developer approves and chooses OpenSpec vs. direct implementation. Primary open item to
  resolve at/after approval: R1 (semantic-release token-less OIDC) and OQ1 (tool choice).
