# CI/CD & Release Automation

## Overview

This document describes the complete release automation pipeline for
`@kamansoft/vite-plugin-flatwave-react`, including every change made, the
reason for each decision, and the required npmjs.com configuration for the
optional (but recommended) OIDC trusted publishing upgrade.

---

## Developer workflow

```
feature branch  →  PR (title validated + CI)  →  merge to main  →  automatic release & npm publish
```

1. Create a feature branch (e.g. `feat/my-feature`).
2. Open a PR targeting `main`.
   - **PR Title Validation** checks the title matches Conventional Commits format.
   - **CI Validation** runs the full suite: format, lint, type-check, build, test.
3. Branch protection requires both checks to pass before merge is allowed.
4. On merge, **Release** workflow fires automatically:
   - Re-runs CI as a hard gate.
   - Runs `semantic-release`, which analyses commit messages, bumps the version,
     publishes `@kamansoft/vite-plugin-flatwave-react` to npmjs.com, and creates
     a GitHub Release with a changelog.

### Conventional Commits — version bump rules

| Commit prefix                               | Version bump            |
| ------------------------------------------- | ----------------------- |
| `fix:`                                      | patch — `0.1.0 → 0.1.1` |
| `feat:`                                     | minor — `0.1.0 → 0.2.0` |
| `feat!:` or `BREAKING CHANGE:` footer       | major — `0.1.0 → 1.0.0` |
| `chore:`, `docs:`, `style:`, `test:`, `ci:` | no release triggered    |

---

## Changes made

### 1. Package renamed to `@kamansoft/vite-plugin-flatwave-react`

**Why:** npm organisations own _scoped_ packages (`@org/package-name`). An
unscoped package cannot be "owned" by an organisation — it must be scoped.

**Files changed:**

| File                                               | Change                                                                            |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| `packages/vite-plugin-flatwave-react/package.json` | `name` → `@kamansoft/vite-plugin-flatwave-react`                                  |
| `package.json` (root)                              | `build:plugin` script workspace flag → `-w @kamansoft/vite-plugin-flatwave-react` |
| `examples/basic-react-site/package.json`           | dependency key renamed to match new package name                                  |
| `examples/basic-react-site/vite.config.ts`         | import updated to `from '@kamansoft/vite-plugin-flatwave-react'`                  |
| `e2e/example.test.ts`                              | `pluginWorkspace` constant updated to `@kamansoft/vite-plugin-flatwave-react`     |
| `package-lock.json`                                | regenerated after `npm install`                                                   |

**First publish — command executed:**

```bash
# One-time manual publish (package did not exist yet; OIDC requires existing package)
# Authenticated as lemyskaman (owner of kamansoft npm org)
npm publish --access public \
  --userconfig /tmp/.npmrc-publish   # temp file with automation token
# Result: + @kamansoft/vite-plugin-flatwave-react@0.1.0
```

Published: https://www.npmjs.com/package/@kamansoft/vite-plugin-flatwave-react

---

### 2. `release.yml` — root-cause fixes

**Previous state:** the workflow had `NPM_TOKEN` set in GitHub Secrets (since
2026-06-17) but **never passed it to the `semantic-release` step** — it was
commented out under an incorrect assumption about OIDC working without any
configuration. Every release run ended with `403 Forbidden`.

#### Fix A — pass `NPM_TOKEN` to `@semantic-release/npm`

```yaml
# Before (broken)
- name: Release
  run: npx semantic-release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NPM_CONFIG_REGISTRY: https://registry.npmjs.org # ← had no effect

# After (fixed)
- name: Release
  run: npx semantic-release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }} # ← @semantic-release/npm reads this directly
```

`@semantic-release/npm` reads `NPM_TOKEN` to build a temporary `.npmrc` for
the publish step. It does **not** use `NODE_AUTH_TOKEN` (that is a convention
specific to `setup-node` + `registry-url`, which we no longer use — see Fix B).

#### Fix B — remove `registry-url` from `setup-node`

```yaml
# Before (caused auth conflicts)
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    registry-url: 'https://registry.npmjs.org' # ← creates .npmrc with ${NODE_AUTH_TOKEN}

# After (correct for semantic-release)
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'npm'
    # registry-url omitted intentionally
```

When `registry-url` is present, `setup-node` writes an `.npmrc` containing
`//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}`. If `NODE_AUTH_TOKEN`
is unset (or set to an empty string), npm uses an empty auth token and fails
with `EINVALIDNPMTOKEN`. This file also interferes with `@semantic-release/npm`'s
own `.npmrc` management. The semantic-release documentation explicitly warns
against using `registry-url` in this context.

Reference: https://semantic-release.gitbook.io/semantic-release/recipes/ci-configurations/github-actions

#### Fix C — CI prerequisite job (`needs: [ci]`)

```yaml
# Before: release job ran immediately in parallel with nothing
jobs:
  release:
    runs-on: ubuntu-latest
    ...

# After: release only runs if CI passes first
jobs:
  ci:
    name: CI Validation
    runs-on: ubuntu-latest
    steps: [checkout, install, validate]

  release:
    name: Release & Publish to npm
    needs: [ci]          # ← hard dependency
    ...
```

Without this, a broken commit merged to `main` could publish a broken package
before CI had a chance to catch the failure.

#### Fix D — concurrency guard

```yaml
concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false
```

Prevents two simultaneous pushes to `main` (e.g. two PRs merged in quick
succession) from triggering overlapping releases. `cancel-in-progress: false`
ensures a running release is never interrupted mid-publish.

#### Fix E — upgrade npm before releasing

```yaml
- name: Upgrade npm to latest
  run: npm install -g npm@latest
```

Node 22 ships with npm 10.x. npm ≥ 11.5.1 is required for OIDC trusted
publishing (see section below). Upgrading in CI guarantees future OIDC
readiness without changing the Node version requirement.

---

### 3. `ci.yml` — remove redundant push-to-main trigger

```yaml
# Before
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]   # ← ran CI twice on every merge

# After
on:
  pull_request:
    branches: [main]
```

`release.yml` now runs its own CI job before releasing, so having `ci.yml`
also run on every push to `main` duplicated effort. The PR-time check (before
merge) is still the primary quality gate, enforced by branch protection.

---

### 4. Branch protection rules (configured via `gh` CLI)

```bash
gh api repos/kamansoft/vite-plugin-flatwave-react/branches/main/protection \
  --method PUT \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["validate", "test-matrix (22)", "test-matrix (24)", "validate-pr-title"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

| Rule                            | Effect                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `required_status_checks`        | `validate`, `test-matrix (22)`, `test-matrix (24)` from `ci.yml` + `validate-pr-title` from `pr-title.yml` must all pass |
| `strict: true`                  | Branch must be up-to-date with `main` before merge                                                                       |
| `required_pull_request_reviews` | PRs are required (0 approvals needed — increase as team grows)                                                           |
| `dismiss_stale_reviews`         | New commits reset approval                                                                                               |
| `allow_force_pushes: false`     | History cannot be rewritten                                                                                              |
| `allow_deletions: false`        | `main` cannot be deleted                                                                                                 |

---

## GitHub Secrets required

| Secret         | Purpose                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| `NPM_TOKEN`    | Automation token used by `@semantic-release/npm` to publish to npmjs.com |
| `GITHUB_TOKEN` | Auto-injected by GitHub Actions — no setup needed                        |

The `NPM_TOKEN` secret was already present in the repository (created 2026-06-17).
It must be a **Granular Access Token** or **Automation Token** (prefix `npm_`).
Classic tokens (UUID format, e.g. `abcd1234-...`) were deprecated by npm on
2025-12-09 and will not work.

### Verifying / recreating the npm token

1. Go to https://www.npmjs.com/settings/~/tokens
2. Click **Generate New Token → Granular Access Token**
3. Set:
   - **Expiration**: No expiration (or 1 year)
   - **Packages and scopes**: `@kamansoft` → Read and write
   - **Organizations**: `kamansoft` → Read and write
4. Copy the generated token
5. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `NPM_TOKEN`
   - Value: paste the token

---

## Optional upgrade: npm OIDC trusted publishing (recommended)

OIDC trusted publishing replaces the long-lived `NPM_TOKEN` with a short-lived
cryptographic identity issued by GitHub Actions at publish time. No static
secret is stored anywhere.

**Prerequisite:** the package must already exist on npmjs.com ✓ (done above).

### Step 1 — Configure on npmjs.com (browser)

1. Go to: https://www.npmjs.com/package/@kamansoft/vite-plugin-flatwave-react/access
2. Scroll to **Trusted Publishers** section.
3. Click **Add a trusted publisher**.
4. Select **GitHub Actions**.
5. Fill in the form exactly as follows:

   | Field                 | Value                        |
   | --------------------- | ---------------------------- |
   | **Owner**             | `kamansoft`                  |
   | **Repository**        | `vite-plugin-flatwave-react` |
   | **Workflow filename** | `release.yml`                |
   | **Environment**       | _(leave empty)_              |

6. Check **Allow publish**.
7. Click **Save**.

> All fields are case-sensitive and must match exactly.
> The workflow filename must not include the `.github/workflows/` path prefix.

### Step 2 — Update `release.yml` to use OIDC (remove NPM_TOKEN)

Once the trusted publisher is saved on npmjs.com, update the Release step:

```yaml
# Remove NPM_TOKEN from the env block:
- name: Release
  run: npx semantic-release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    # NPM_TOKEN removed — OIDC handles auth via id-token: write permission
```

The `npm install -g npm@latest` step (already present) ensures npm ≥ 11.5.1,
which detects the GitHub Actions OIDC environment and exchanges the short-lived
token automatically.

### Step 3 — Delete the NPM_TOKEN secret (optional)

After confirming a successful OIDC-based release, you can remove the
`NPM_TOKEN` secret from GitHub:
**Settings → Secrets and variables → Actions → NPM_TOKEN → Delete**.

---

## Workflow diagram

```
PR opened / pushed
    │
    ├── PR Title Validation (pr-title.yml)
    │       validates: Conventional Commits format (feat/fix/chore/...)
    │
    └── CI Validation (ci.yml)
            validates: format-check, lint, type-check, build, test
            matrix: Node 22, Node 24

PR merge to main (blocked until both checks pass)
    │
    └── Release (release.yml)
            │
            ├── CI Validation job (re-run as hard gate)
            │       same validation suite as PR
            │
            └── Release & Publish job (needs: ci)
                    ├── Upgrade npm to latest
                    ├── Build plugin
                    └── npx semantic-release
                            ├── Analyses commits since last release
                            ├── Determines next version (semver)
                            ├── Updates package.json version
                            ├── Publishes @kamansoft/vite-plugin-flatwave-react to npmjs.com
                            ├── Creates git tag (e.g. v0.2.0)
                            └── Creates GitHub Release with changelog
```

---

## Troubleshooting

### Release workflow fails with `403 Forbidden` on npm publish

- The `NPM_TOKEN` secret is missing, expired, or a deprecated Classic Token.
- Recreate a Granular Access Token (see **GitHub Secrets** section above) and
  update the `NPM_TOKEN` secret in GitHub.

### Release workflow fails with `EINVALIDNPMTOKEN`

- The `registry-url` option is set in the `setup-node` step.
- Remove `registry-url` from `setup-node` in `release.yml`. The
  `@semantic-release/npm` plugin manages its own `.npmrc` — `registry-url`
  creates a conflicting file.

### semantic-release finds no commits to release

- Only commits with `feat:`, `fix:`, or `BREAKING CHANGE:` trigger a release.
- `chore:`, `docs:`, `ci:`, `style:` commits merge cleanly but produce no new version.

### PR is blocked — required checks not appearing

- Required checks only appear after the first run of the workflow on that branch.
- Push a commit to the PR branch to trigger CI and populate the status checks.

### OIDC publish fails with `Unable to authenticate` (`ENEEDAUTH`)

- The workflow filename in the npmjs.com trusted publisher config must match
  **exactly** (case-sensitive, including `.yml` extension, no path prefix).
- The `id-token: write` permission must be present in the `release` job.
- Only GitHub-hosted runners are supported for OIDC trusted publishing.
  Self-hosted runners will not work.
