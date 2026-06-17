# Feature: publish-to-npm

- **Feature ID:** `publish-to-npm`
- **Status:** Approved — in implementation on branch `feat/publish-to-npm`
- **Created:** 2026-06-16 18:44 -05
- **Owner:** KamanaSoft
- **Package:** `vite-plugin-flatwave-react` (`packages/vite-plugin-flatwave-react`)

## 1. Summary / User story

> As a maintainer, when a PR is merged into `main`, the plugin is **automatically
> versioned according to Conventional Commits** and **published to npmjs** (public,
> with provenance) using **tokenless OIDC Trusted Publishing**, so that releases
> require no manual version edits and no long-lived secrets in CI.

## 2. Background / current state

This is the high-level requirement ("publish the npm plugin to npmjs automatically on
every PR merge to `main`") refined into a tracked story. A first-pass implementation
**already exists on `main`** and must be reconciled with the decisions in §4:

- Publishable package `packages/vite-plugin-flatwave-react/package.json`:
  - `name: vite-plugin-flatwave-react`, `version: 0.1.0`
  - `publishConfig`: `{ "access": "public", "provenance": true }`
  - correct `files`, `exports`, `bin`, `repository.directory`
- Workspace root `package.json` is `private: true` with workspaces `packages/*`, `examples/*`.
- Existing workflow `.github/workflows/release.yml`:
  - triggers: `pull_request: [closed] -> main`, `release: [published]`, `workflow_dispatch`
  - publishes only when `pull_request.merged == true` and base is `main`
  - **bumps PATCH** via `packages/vite-plugin-flatwave-react/scripts/bump-patch-version.js`
  - commits the bump back to `main` and pushes
  - builds, runs `npm pack --dry-run`, then `npm publish --provenance --access public`
  - authenticates with `NPM_TOKEN` secret (`NODE_AUTH_TOKEN`), with an implicit OIDC fallback
- Verified externally (session of 2026-06-16):
  - package is **not yet on npm** (`npm view` → 404; the name is available)
  - repo `kamansoft/vite-plugin-flatwave-react` is **public**, default branch `main`, **no branch protection**
  - not logged into npm locally; `NPM_TOKEN` secret presence **unconfirmed**

**Gap vs. target:** current behavior is *patch-only* bumping and *token-based* auth. The
decisions in §4 change both. The existing `bump-patch-version.js` + manual bump/commit/push
steps are therefore expected to be **replaced**, not extended.

## 3. Goals & non-goals

### Goals
- Zero-touch release on merge to `main`, version derived from commit history.
- Eliminate long-lived npm credentials from CI (OIDC).
- Keep supply-chain provenance.

### Non-goals (out of scope for this story)
- Publishing the example app or the workspace root (they stay `private`).
- Enforcing commit message format via tooling (commitlint) — optional follow-up.
- Multi-package / monorepo release orchestration (only one publishable package today).
- Any change to the plugin's public API or build output.

## 4. Decisions (confirmed with developer)

1. **Versioning = Conventional Commits**: `fix:` → PATCH, `feat:` → MINOR,
   `feat!:` / `BREAKING CHANGE:` → MAJOR. No releasable commits → no release.
2. **Auth = npm Trusted Publishing (OIDC)**: tokenless; remove reliance on `NPM_TOKEN`.
3. **Provenance**: keep enabled.
4. **Docs** confirmed up to date (Step 0.1) — proceed.
5. **Execution environment:** local one-time/rare manual publishes and the local dry-run run on the host via a **momentary `nvm use`** (Node ≥ 22.14); the default Node is unchanged and nothing is installed globally (release tooling stays a repo devDependency). Routine releases run automatically in CI on the GitHub Actions runner (native). *(Docker was evaluated but the container ran git as root over the host-owned bind mount → `ENOGITREPO`; nvm is simpler.)*

## 5. Functional requirements

- **FR1** Release runs automatically when changes land on `main` (PR merge).
- **FR2** Next version is computed from Conventional Commits since the last release tag;
  if no releasable commit exists, the run completes without publishing.
- **FR3** Publish to the public npm registry with `access: public`.
- **FR4** Authentication uses OIDC Trusted Publishing — no `NPM_TOKEN` in the publish path.
- **FR5** The published artifact includes npm provenance.
- **FR6** A release produces: a git tag `vX.Y.Z`, a GitHub Release, and a `CHANGELOG` entry.
- **FR7** Only `vite-plugin-flatwave-react` is versioned/published; root + example remain private.
- **FR8** A documented one-time **first-publish bootstrap** brings the package live on npm
  and enables the trusted publisher.
- **FR9** Local manual publishes (the one-time bootstrap and rare manual releases) and the local
  dry-run run on the host via a momentary `nvm use` (Node ≥ 22.14) — the default Node is unchanged
  and no global installs are made. Routine releases remain automated in CI on the native runner.

## 6. Non-functional requirements

- **Security**: no long-lived tokens in CI; least-privilege `GITHUB_TOKEN`; `id-token: write`.
- **Idempotency**: re-running a release for an already-published version must not double-publish.
- **Observability**: a dry-run/inspection step and a feature log per change.
- **Maintainability**: prefer standard release tooling over hand-rolled version logic
  (lazy-senior-dev: don't hand-roll semver parsing that a standard tool already does correctly).
- **Tooling**: npm CLI ≥ 11.5.1 in CI (required for OIDC Trusted Publishing).

## 7. Acceptance criteria

- **AC1** Merging a PR containing a `fix:` commit publishes a new **PATCH** to npm.
- **AC2** A `feat:` commit yields a **MINOR**; `feat!:` / `BREAKING CHANGE:` yields a **MAJOR**.
- **AC3** Merging only non-releasable commits (e.g. `chore:`, `docs:`) publishes **nothing**.
- **AC4** The npm release shows **provenance** and is **public**.
- **AC5** Publishing succeeds with **no `NPM_TOKEN`** configured (OIDC path).
- **AC6** Each release creates a **`vX.Y.Z` tag**, a **GitHub Release**, and a **CHANGELOG** entry.
- **AC7** `npm pack` / publish includes **only** the plugin; workspace root + example are never published.
- **AC8** The **first publish** completes and `npm view vite-plugin-flatwave-react version` resolves.
- **AC9** `dev-notes/publish-to-npm/scripts/local-publish.sh` (and `dry-run-release.sh`) run under a
  momentary nvm Node ≥ 22.14 and leave the user's default Node version unchanged.

## 8. Assumptions

- Repo is public, default branch `main`, no branch protection (verified); if protection is
  added later, the release automation must be permitted to push tags/changelog commits.
- Maintainer has **npm org/package admin** (to configure the trusted publisher) and
  **GitHub repo admin** (Actions permissions / environments).
- Contributors follow Conventional Commits (via squash-merge PR titles or commit messages).

## 9. Open questions / risks

- **OQ1 (tool choice)** `semantic-release` (publish-on-merge, matches "every merge → publish")
  vs `release-please` (release-PR cadence, cleanest OIDC fit). See plan §Approach.
- **R1** `semantic-release`'s `verifyConditions` historically expects `NPM_TOKEN`; confirm a
  token-less OIDC path works with current `@semantic-release/npm`, else fall back to
  `release-please` or a one-time token.
- **R2** Trusted publishing generally requires the package to **already exist**, creating a
  first-publish chicken-and-egg → handled by FR8 bootstrap.
- **R3** Monorepo scoping: the release tool must run against the plugin package only.
- **R4** Without commit linting, malformed commits produce wrong/no bumps (accepted; see non-goals).

## 10. References

- `.github/workflows/release.yml`
- `packages/vite-plugin-flatwave-react/package.json`
- `packages/vite-plugin-flatwave-react/scripts/bump-patch-version.js`
- `package.json` (workspace root)
- Plan: `dev-notes/publish-to-npm/plans/0001-conventional-commits-oidc-autopublish.md`
