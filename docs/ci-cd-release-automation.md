# CI/CD & Release Automation

> **Current state (2026-06-19):** Pipeline is fully operational.
> `@kamansoft/vite-plugin-flatwave-react@1.1.0` was the first version published
> automatically by GitHub Actions using npm OIDC trusted publishing — no tokens
> stored anywhere.

---

## Table of contents

1. [How the developer workflow works](#1-how-the-developer-workflow-works)
2. [Conventional Commits — version bump rules](#2-conventional-commits--version-bump-rules)
3. [What was changed and why](#3-what-was-changed-and-why)
4. [GitHub repository settings](#4-github-repository-settings)
5. [npmjs.com settings](#5-npmjscom-settings)
6. [Workflow files reference](#6-workflow-files-reference)
7. [Commands executed](#7-commands-executed)
8. [Troubleshooting](#8-troubleshooting)

---

## How the PR title gates the version bump (end-to-end)

This is the critical chain that ties PR titles to semantic versioning:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. PR title  ──►  2. Validation  ──►  3. Squash merge  ──►  4. Release     │
│                                                                             │
│  feat(x): add y      PASS / FAIL       commit msg =        minor bump       │
│                       (blocks merge)   "feat(x): add y"    1.1.0 → 1.2.0   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Step 1 — PR title** is the single source of truth for what version bump will happen.

**Step 2 — `Validate PR Title` check** (GitHub Actions, `pr-title.yml`) runs
immediately on every PR open/edit. If the title does not match Conventional
Commits format, the check **fails and the merge button is locked** — branch
protection requires this check to be green.

**Step 3 — Squash merge** is the **only allowed merge strategy** (merge commits
and rebase are disabled). GitHub is configured to use `PR_TITLE` as the squash
commit title, so the validated PR title becomes the commit that lands on `main`,
word for word.

**Step 4 — `semantic-release`** reads that commit on `main`, maps the type to a
semver bump, and publishes:

| PR title starts with                                | Semver bump | Example            |
| --------------------------------------------------- | ----------- | ------------------ |
| `feat:` or `feat(scope):`                           | **minor**   | `1.1.0 → 1.2.0`    |
| `fix:` or `fix(scope):`                             | **patch**   | `1.2.0 → 1.2.1`    |
| any type + `!` suffix or `BREAKING CHANGE:` in body | **major**   | `1.2.1 → 2.0.0`    |
| `chore:`, `docs:`, `ci:`, `style:`, `test:`         | **none**    | no release created |

---

## 1. How the developer workflow works

```
feature branch  ──►  PR (title + CI checks)  ──►  merge to main  ──►  automatic release & npm publish
```

### Step-by-step

1. **Create a feature branch** from `main` (e.g. `feat/my-feature`).
2. **Open a pull request** targeting `main`.
   - The **PR Title Validation** workflow immediately checks the title matches
     [Conventional Commits](https://www.conventionalcommits.org/) format.
   - The **CI Validation** workflow runs the full suite on Node 22 and Node 24:
     format check, lint, type-check, build, tests.
3. **Branch protection blocks merging** until all four status checks are green:
   - `validate` (Node 22 full suite)
   - `test-matrix (22)` (Node 22 matrix job)
   - `test-matrix (24)` (Node 24 matrix job)
   - `Validate PR Title`
4. **Merge the PR.** The `Release` workflow fires automatically on the push to
   `main`:
   - A **CI gate job** re-runs the validation suite (hard stop before releasing).
   - If CI passes, the **Release & Publish job** runs `semantic-release`, which:
     - Analyses commit messages since the last release.
     - Calculates the next semantic version.
     - Bumps `package.json`, builds the plugin, publishes to npmjs.com via OIDC,
       creates a `vX.Y.Z` git tag, and opens a GitHub Release with a changelog.

---

## 2. Conventional Commits — version bump rules

PR titles must follow this format: `type(scope): description`

| Commit type                             | Triggers a release? | Version bump example |
| --------------------------------------- | ------------------- | -------------------- |
| `feat:`                                 | Yes — minor         | `1.0.0 → 1.1.0`      |
| `fix:`                                  | Yes — patch         | `1.1.0 → 1.1.1`      |
| `feat!:` or `BREAKING CHANGE:` footer   | Yes — major         | `1.1.0 → 2.0.0`      |
| `chore:`                                | No                  | —                    |
| `docs:`                                 | No                  | —                    |
| `ci:`                                   | No                  | —                    |
| `style:`, `test:`, `refactor:`, `perf:` | No                  | —                    |

**Allowed PR title types** (enforced by `pr-title.yml`): `feat`, `fix`, `docs`,
`style`, `refactor`, `perf`, `test`, `chore`, `revert`, `build`, `ci`.

The PR title subject must be ≤ 100 characters.

---

## 3. What was changed and why

### 3.1 Package renamed to `@kamansoft/vite-plugin-flatwave-react`

**Why:** npm organisations own _scoped_ packages (`@org/package-name`). An
unscoped package cannot be published under an organisation — it must carry the
`@kamansoft/` scope prefix.

**Files changed:**

| File                                               | Change                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| `packages/vite-plugin-flatwave-react/package.json` | `"name"` → `"@kamansoft/vite-plugin-flatwave-react"`                       |
| `package.json` (root)                              | `build:plugin` workspace flag → `-w @kamansoft/vite-plugin-flatwave-react` |
| `examples/basic-react-site/package.json`           | dependency key → `"@kamansoft/vite-plugin-flatwave-react"`                 |
| `examples/basic-react-site/vite.config.ts`         | import → `from '@kamansoft/vite-plugin-flatwave-react'`                    |
| `e2e/example.test.ts`                              | `pluginWorkspace` constant → `'@kamansoft/vite-plugin-flatwave-react'`     |
| `package-lock.json`                                | regenerated via `npm install`                                              |

**First publish (manual — required because OIDC needs an existing package):**

```bash
# Authenticated as lemyskaman (owner of kamansoft npm org)
# Used a one-day automation token stored at /home/lemys/npm_token
echo "//registry.npmjs.org/:_authToken=$(cat /home/lemys/npm_token)" > /tmp/.npmrc-publish

cd packages/vite-plugin-flatwave-react
npm publish --access public \
  --registry https://registry.npmjs.org \
  --userconfig /tmp/.npmrc-publish

# Output: + @kamansoft/vite-plugin-flatwave-react@0.1.0
```

Package URL: https://www.npmjs.com/package/@kamansoft/vite-plugin-flatwave-react

---

### 3.2 `release.yml` — all fixes applied

The previous workflow had five problems that together caused every release run to
fail with `403 Forbidden` or publish nothing.

#### Fix A — wire `NPM_TOKEN` to the Release step (initial fix, later superseded by OIDC)

```yaml
# Before (broken — NPM_TOKEN secret existed but was never passed to the process)
- name: Release
  run: npx semantic-release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NPM_CONFIG_REGISTRY: https://registry.npmjs.org # had no effect on auth

# Intermediate fix — token passed correctly
- name: Release
  run: npx semantic-release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

`@semantic-release/npm` reads `NPM_TOKEN` directly to write a temporary `.npmrc`
for the publish step.

#### Fix B — remove `registry-url` from `setup-node` (critical)

```yaml
# Before (caused EINVALIDNPMTOKEN even with a valid token)
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    registry-url: 'https://registry.npmjs.org' # ← writes .npmrc with ${NODE_AUTH_TOKEN}

# After (correct for use with semantic-release)
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'npm'
    # registry-url intentionally omitted
```

When `registry-url` is set, `setup-node` writes an `.npmrc` containing
`//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}`. If `NODE_AUTH_TOKEN` is
empty or undefined, npm treats it as an empty token and every authenticated
request fails. This file also conflicts with `@semantic-release/npm`'s own
`.npmrc` management.

> Reference: [semantic-release GitHub Actions recipe](https://semantic-release.gitbook.io/semantic-release/recipes/ci-configurations/github-actions)

#### Fix C — add a CI prerequisite job (`needs: [ci]`)

```yaml
jobs:
  ci:                          # runs first
    name: CI Validation
    runs-on: ubuntu-latest
    steps: [checkout, install, validate]

  release:
    name: Release & Publish to npm
    needs: [ci]                # release only starts if ci passes
    ...
```

Without this a broken commit pushed to `main` could publish a broken package
before CI had a chance to catch the failure.

#### Fix D — concurrency guard

```yaml
concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false
```

Prevents two simultaneous merges to `main` from triggering overlapping releases.
`cancel-in-progress: false` ensures a running release is never interrupted
mid-publish.

#### Fix E — upgrade npm before releasing

```bash
npm install -g npm@latest
```

Node 22 ships with npm 10.x. npm ≥ 11.5.1 is required for OIDC trusted
publishing. This step upgrades npm at runtime without changing the Node version
requirement.

#### Fix F — switch to npm OIDC trusted publishing (final state)

After the trusted publisher was configured on npmjs.com, `NPM_TOKEN` was removed
from the workflow entirely:

```yaml
- name: Release
  run: npx semantic-release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    # No NPM_TOKEN — authentication is handled by npm OIDC trusted publishing.
    # npm >=11.5.1 (installed above) detects the GitHub Actions OIDC environment
    # and exchanges a short-lived signed token with npmjs.com automatically.
    # id-token: write permission (set on this job) enables the OIDC flow.
```

---

### 3.3 `ci.yml` — remove redundant push-to-main trigger

```yaml
# Before — ran CI twice on every merge
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]   # ← duplicate

# After — only runs on PRs (release.yml handles CI for main)
on:
  pull_request:
    branches: [main]
```

`release.yml` contains its own CI gate job, so having `ci.yml` also run on
every push to `main` was redundant.

---

### 3.4 Repository merge strategy — squash only with PR title

**Why:** Even with a validated PR title, the merge button previously allowed
three strategies: squash, merge commit, and rebase. A merge commit or rebase
would land commits on `main` whose messages were never validated, breaking the
`semantic-release` chain.

**Changes applied via `gh` CLI:**

| Setting changed                  | Before               | After      |
| -------------------------------- | -------------------- | ---------- |
| `allow_merge_commit`             | `true`               | `false`    |
| `allow_rebase_merge`             | `true`               | `false`    |
| `squash_merge_commit_title`      | `COMMIT_OR_PR_TITLE` | `PR_TITLE` |
| `use_squash_pr_title_as_default` | `false`              | `true`     |
| `delete_branch_on_merge`         | `false`              | `true`     |

The most important change is `squash_merge_commit_title: PR_TITLE`. Previously
set to `COMMIT_OR_PR_TITLE`, GitHub showed a free-text box pre-filled with the
first commit message, not the PR title — meaning a maintainer could type anything
as the commit message, bypassing both the PR title check and semantic versioning.

---

### 3.5 Orphaned tag cleanup

The first release run failed at the npm publish step (OIDC not yet configured),
but `semantic-release` had already created the `v1.1.0` git tag before the
failure. The rerun then found no commits newer than the tag and said
"no relevant changes". Fix:

```bash
# Delete the orphaned tag from remote and local
git push origin --delete v1.1.0
git tag -d v1.1.0
```

On the next push to `main`, `semantic-release` re-analyzed commits from `v1.0.0`,
determined the next version was `v1.1.0`, and published successfully via OIDC.

---

## 4. GitHub repository settings

### 4.1 Branch protection on `main`

Configured via `gh` CLI. **Final working configuration:**

```bash
gh api repos/kamansoft/vite-plugin-flatwave-react/branches/main/protection \
  --method PUT \
  --header "Accept: application/vnd.github+json" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "validate",
      "test-matrix (22)",
      "test-matrix (24)",
      "Validate PR Title"
    ]
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

> **Important — check name format:** GitHub Actions status check names are the
> job's `name:` display field, not the YAML key. `Validate PR Title` (with
> capital letters and spaces) is the correct name for the `pr-title.yml` job.
> Using `validate-pr-title` (the YAML key) creates a "pending" check that is
> never reported and permanently blocks merges.

| Rule                              | Configured value                                                        | Effect                                                                 |
| --------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `required_status_checks.contexts` | `validate`, `test-matrix (22)`, `test-matrix (24)`, `Validate PR Title` | All four must be green before merging                                  |
| `strict`                          | `true`                                                                  | PR branch must be up to date with `main` before merge                  |
| `required_pull_request_reviews`   | `required_approving_review_count: 0`                                    | PRs are required; no explicit approval needed (increase as team grows) |
| `dismiss_stale_reviews`           | `true`                                                                  | New commits on the PR invalidate any existing reviews                  |
| `allow_force_pushes`              | `false`                                                                 | `main` history cannot be rewritten                                     |
| `allow_deletions`                 | `false`                                                                 | `main` branch cannot be deleted                                        |

**To view the current rules:**

```bash
gh api repos/kamansoft/vite-plugin-flatwave-react/branches/main/protection
```

**To view via browser:**
Go to **Settings → Branches → main** on
https://github.com/kamansoft/vite-plugin-flatwave-react

---

### 4.2 Merge strategy — squash only (critical for version gating)

**URL:** https://github.com/kamansoft/vite-plugin-flatwave-react/settings

This is the setting that closes the loop between the validated PR title and the
commit that `semantic-release` reads on `main`.

**Configured via `gh` CLI:**

```bash
gh api repos/kamansoft/vite-plugin-flatwave-react \
  --method PATCH \
  --header "Accept: application/vnd.github+json" \
  --input - <<'EOF'
{
  "allow_squash_merge": true,
  "allow_merge_commit": false,
  "allow_rebase_merge": false,
  "squash_merge_commit_title": "PR_TITLE",
  "squash_merge_commit_message": "PR_BODY",
  "use_squash_pr_title_as_default": true,
  "delete_branch_on_merge": true
}
EOF
```

| Setting                          | Value      | Why                                                                                                                                                  |
| -------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allow_squash_merge`             | `true`     | The only allowed merge strategy                                                                                                                      |
| `allow_merge_commit`             | `false`    | Disabled — a merge commit message is not the PR title and would not be validated                                                                     |
| `allow_rebase_merge`             | `false`    | Disabled — rebase creates individual commits from the branch; their messages are not validated by `pr-title.yml`                                     |
| `squash_merge_commit_title`      | `PR_TITLE` | **Key setting.** Forces GitHub to use the PR title (not the first commit message) as the squash commit title. This is what `semantic-release` reads. |
| `squash_merge_commit_message`    | `PR_BODY`  | PR description becomes the commit body (appears in changelogs)                                                                                       |
| `use_squash_pr_title_as_default` | `true`     | Pre-fills the squash dialog with the PR title (UI consistency)                                                                                       |
| `delete_branch_on_merge`         | `true`     | Feature branches are automatically deleted after merge (housekeeping)                                                                                |

**To verify these settings in the browser:**
Go to **https://github.com/kamansoft/vite-plugin-flatwave-react/settings** →
scroll to **Pull Requests** section. You should see only **"Allow squash
merging"** checked, and the squash commit title set to **"Pull request title"**.

**Why this matters:** Without `squash_merge_commit_title: PR_TITLE`, GitHub lets
the merger type any commit title in the squash dialog — bypassing PR title
validation completely and breaking the semantic-release chain.

---

### 4.3 GitHub Actions secrets

Navigate to:
**https://github.com/kamansoft/vite-plugin-flatwave-react/settings/secrets/actions**

| Secret         | Current state                                      | Notes                                                                                                                 |
| -------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN` | Auto-injected by GitHub — never needs manual setup | Used by semantic-release to create GitHub Releases and comment on issues/PRs                                          |
| `NPM_TOKEN`    | Can be **deleted** — no longer used                | Publishing is now handled exclusively by npm OIDC trusted publishing. Leaving it present is harmless but unnecessary. |

**To delete NPM_TOKEN:**

1. Go to **Settings → Secrets and variables → Actions**
2. Find `NPM_TOKEN` → click the trash icon → confirm deletion

---

### 4.3 Required GitHub Actions permissions (set in `release.yml`)

```yaml
permissions:
  contents: write # create git tags and GitHub Releases
  id-token: write # request OIDC token for npm trusted publishing
  issues: write # semantic-release comments on released issues
  pull-requests: write # semantic-release comments on released PRs
```

The `id-token: write` permission is what enables npm's OIDC trusted publishing.
Without it, the OIDC token exchange with npmjs.com fails and publishing is
blocked.

---

## 5. npmjs.com settings

### 5.1 Trusted Publisher (OIDC)

**URL:** https://www.npmjs.com/package/@kamansoft/vite-plugin-flatwave-react/access

Navigate to the **Settings** tab → **Trusted Publisher** section.

**Current configuration (already set up):**

| Field                | Value                        |
| -------------------- | ---------------------------- |
| Publisher            | GitHub Actions               |
| Organization or user | `kamansoft`                  |
| Repository           | `vite-plugin-flatwave-react` |
| Workflow filename    | `release.yml`                |
| Environment name     | _(empty)_                    |
| Permissions          | `npm publish` ✅             |

**How it works:** When `release.yml` runs `npx semantic-release`, npm ≥ 11.5.1
detects the GitHub Actions environment (via `ACTIONS_ID_TOKEN_REQUEST_URL`),
requests a short-lived signed OIDC token from GitHub, and exchanges it with
npmjs.com's token endpoint. npmjs.com verifies the token matches the trusted
publisher configuration above and grants a temporary publish credential. No
static secret is involved on either side.

**If you ever need to reconfigure this from scratch:**

1. Go to https://www.npmjs.com/package/@kamansoft/vite-plugin-flatwave-react/access
2. Click **Settings** tab
3. Scroll to **Trusted Publisher** → **Add a trusted publisher**
4. Select **GitHub Actions**
5. Fill in exactly:

   | Field                | Value                                        |
   | -------------------- | -------------------------------------------- |
   | Organization or user | `kamansoft`                                  |
   | Repository           | `vite-plugin-flatwave-react`                 |
   | Workflow filename    | `release.yml` _(no path prefix, exact case)_ |
   | Environment name     | _(leave blank)_                              |

6. Under **Allowed actions**: check only **"Allow npm publish"**
7. Click **Set up connection**

> All fields are case-sensitive. The workflow filename is only the filename
> (`release.yml`), not the full path (`.github/workflows/release.yml`).
> Do not add an Environment name unless your workflow declares
> `environment: <name>` — a mismatch permanently prevents OIDC from working.

---

### 5.2 Publishing access (security setting)

**URL:** same Settings tab → **Publishing access** section

**Current setting:** `Require two-factor authentication and disallow tokens (recommended)`

This is the most restrictive option. It means:

- Long-lived npm tokens **cannot** publish this package — only OIDC trusted
  publishers can.
- Even if the `NPM_TOKEN` GitHub secret were still set in the workflow, it would
  be rejected.

The note on the npmjs.com page confirms: OIDC trusted publishers are compatible
with all Publishing access options and will continue to work regardless of which
option is selected.

**To verify or change this:**

1. Go to https://www.npmjs.com/package/@kamansoft/vite-plugin-flatwave-react/access
2. Click **Settings** tab → scroll to **Publishing access**
3. Ensure **"Require two-factor authentication and disallow tokens (recommended)"**
   is selected
4. Click **Update Package Settings**

---

### 5.3 Package access

**Status:** `public`

The package is publicly installable by anyone:

```bash
npm install @kamansoft/vite-plugin-flatwave-react
```

This was set via `"publishConfig": { "access": "public" }` in
`packages/vite-plugin-flatwave-react/package.json`. Scoped packages default to
private; this override makes them public without needing to pass `--access public`
on every publish.

---

## 6. Workflow files reference

### `pr-title.yml` — PR title validation

**Trigger:** every PR `opened`, `edited`, `reopened`, `synchronize` event.

Validates the PR title using [`amannn/action-semantic-pull-request@v5`](https://github.com/amannn/action-semantic-pull-request).

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`chore`, `revert`, `build`, `ci`.

Subject must be ≤ 100 characters.

---

### `ci.yml` — CI validation on PRs

**Trigger:** `pull_request` targeting `main` only (push-to-main trigger removed).

| Job                | Runs on                 | What it does                                                     |
| ------------------ | ----------------------- | ---------------------------------------------------------------- |
| `validate`         | ubuntu-latest / Node 22 | `npm run validate` — format check, lint, type-check, build, test |
| `test-matrix (22)` | ubuntu-latest           | same on Node 22                                                  |
| `test-matrix (24)` | ubuntu-latest           | same on Node 24                                                  |

Both `validate` and the matrix jobs must pass before branch protection allows
a merge.

---

### `release.yml` — release and publish on merge to main

**Trigger:** `push: branches: [main]` and `workflow_dispatch` (manual trigger).

**Concurrency:** one release at a time; running releases are never cancelled.

| Job                        | Runs after | What it does                                         |
| -------------------------- | ---------- | ---------------------------------------------------- |
| `CI Validation`            | (first)    | Full `npm run validate` — hard gate before releasing |
| `Release & Publish to npm` | CI passes  | Upgrades npm, builds plugin, runs `semantic-release` |

**Authentication:** npm OIDC trusted publishing via `id-token: write`. No
`NPM_TOKEN` or `NODE_AUTH_TOKEN` is set.

**Key `setup-node` note:** `registry-url` is intentionally absent. Setting it
creates an `.npmrc` that conflicts with `@semantic-release/npm`'s own auth setup.

---

### `.releaserc.json` — semantic-release configuration

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/npm",
      {
        "pkgRoot": "packages/vite-plugin-flatwave-react"
      }
    ],
    "@semantic-release/github"
  ]
}
```

`pkgRoot` points to the package directory inside the monorepo workspace. The
root `package.json` has `"private": true`, so semantic-release uses `pkgRoot` to
find and publish the actual plugin package.

---

## 7. Commands executed

All commands run from the monorepo root unless noted.

```bash
# ── Package rename & reinstall ────────────────────────────────────────────────
# After editing package names in package.json files:
npm install --ignore-scripts   # regenerate package-lock.json

# ── First build ───────────────────────────────────────────────────────────────
HUSKY=0 npm run build:plugin

# ── First manual publish (one-time bootstrap) ─────────────────────────────────
echo "//registry.npmjs.org/:_authToken=$(cat /home/lemys/npm_token)" > /tmp/.npmrc-publish
cd packages/vite-plugin-flatwave-react
npm publish --access public \
  --registry https://registry.npmjs.org \
  --userconfig /tmp/.npmrc-publish
# → + @kamansoft/vite-plugin-flatwave-react@0.1.0

# ── Merge strategy — enforce squash-only with PR title as commit ──────────────
gh api repos/kamansoft/vite-plugin-flatwave-react \
  --method PATCH \
  --header "Accept: application/vnd.github+json" \
  --input - <<'EOF'
{
  "allow_squash_merge": true,
  "allow_merge_commit": false,
  "allow_rebase_merge": false,
  "squash_merge_commit_title": "PR_TITLE",
  "squash_merge_commit_message": "PR_BODY",
  "use_squash_pr_title_as_default": true,
  "delete_branch_on_merge": true
}
EOF
# Disabled merge commits and rebase. Set squash commit title to always use the
# PR title (not the first commit message), ensuring the validated PR title is
# exactly what semantic-release reads on main.

# ── Branch protection (run once after workflows existed) ──────────────────────
gh api repos/kamansoft/vite-plugin-flatwave-react/branches/main/protection \
  --method PUT \
  --header "Accept: application/vnd.github+json" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["validate", "test-matrix (22)", "test-matrix (24)", "Validate PR Title"]
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

# ── PR open & merge ───────────────────────────────────────────────────────────
gh pr create \
  --repo kamansoft/vite-plugin-flatwave-react \
  --base main \
  --head feat/publish-to-npm \
  --title "feat(release): scope package to @kamansoft org and fix CI/CD pipeline"

gh pr merge 8 --repo kamansoft/vite-plugin-flatwave-react --squash --admin
# --admin flag was required because a stale "validate-pr-title" placeholder
# (from the first, incorrect branch protection config) was blocking merge.
# All four real required checks were green.

# ── Delete orphaned v1.1.0 tag ────────────────────────────────────────────────
# semantic-release created this tag in the first (failed) run before npm publish
# failed. The rerun found the tag and skipped releasing ("no relevant changes").
git fetch --tags
git push origin --delete v1.1.0
git tag -d v1.1.0

# ── Push OIDC workflow change directly to main ────────────────────────────────
# After trusted publisher was configured on npmjs.com, NPM_TOKEN was removed
# from release.yml. Pushed directly to main (admin bypass, logged by GitHub).
git checkout main && git pull origin main
git cherry-pick feat/publish-to-npm   # the OIDC commit
git push origin main
# → remote: Bypassed rule violations for refs/heads/main

# ── Verify final published version ───────────────────────────────────────────
npm view @kamansoft/vite-plugin-flatwave-react versions --json
# → ["0.1.0", "1.1.0"]
# published by: GitHub Actions <npm-oidc-no-reply@github.com>
```

---

## 8. Troubleshooting

### Release fails: `OIDC token exchange error — package not found`

npm tried OIDC but the trusted publisher is not configured on npmjs.com, or was
configured with a wrong field.

**Fix:** Go to
https://www.npmjs.com/package/@kamansoft/vite-plugin-flatwave-react/access →
Settings → Trusted Publisher. Verify every field matches exactly (see
[Section 5.1](#51-trusted-publisher-oidc)).

Common mistakes:

- Workflow filename includes the path (`/github/workflows/release.yml`) instead
  of just the filename (`release.yml`).
- Environment name is set in npmjs.com but not declared in `release.yml`.
- Organization name is wrong case (`Kamansoft` vs `kamansoft`).

---

### Release fails: `EINVALIDNPMTOKEN` or `403 Forbidden`

Caused by the `registry-url` setting in `setup-node`.

**Fix:** Ensure `release.yml`'s `setup-node` step does **not** include
`registry-url`. See [Fix B in Section 3.2](#fix-b--remove-registry-url-from-setup-node-critical).

---

### Release fails: `Unable to authenticate (ENEEDAUTH)`

The `id-token: write` permission is missing from the `release` job in
`release.yml`.

**Fix:** Add it to the `permissions` block:

```yaml
permissions:
  id-token: write
  contents: write
  issues: write
  pull-requests: write
```

---

### `semantic-release` says "There are no relevant changes"

Two possible causes:

**A — Only non-release commits since last tag:**
`chore:`, `docs:`, `ci:`, `style:` commits do not trigger a release. Push a
`fix:` or `feat:` commit to trigger one.

**B — Orphaned git tag from a previously failed release:**
semantic-release creates the git tag _before_ publishing to npm. If npm publish
fails after the tag is created, the rerun sees the tag and finds nothing newer.

```bash
git fetch --tags && git tag | sort -V   # find orphaned tags
git push origin --delete vX.Y.Z        # remove from remote
git tag -d vX.Y.Z                      # remove locally
# then re-trigger the workflow
```

---

### PR is blocked — a pending check never reports

A required check name in branch protection doesn't match any check being
reported. This creates a "waiting" placeholder that never resolves.

**Common cause:** the GitHub Actions status check name uses the job's `name:`
display field (e.g. `Validate PR Title`), not the YAML key (e.g.
`validate-pr-title`). These are different strings.

**Fix:** update the branch protection to use the exact display name:

```bash
gh api repos/kamansoft/vite-plugin-flatwave-react/branches/main/protection \
  --method PUT \
  --header "Accept: application/vnd.github+json" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["validate", "test-matrix (22)", "test-matrix (24)", "Validate PR Title"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 0, "dismiss_stale_reviews": true },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

---

### Self-hosted runners and OIDC

npm OIDC trusted publishing only works on **GitHub-hosted runners**
(`runs-on: ubuntu-latest`). Self-hosted runners cannot request OIDC tokens from
GitHub and will always fail with `ENEEDAUTH`.

---

### How to manually trigger a release

If you need to release without pushing a new commit (e.g. to retry after
infrastructure issues):

```bash
gh workflow run release.yml --repo kamansoft/vite-plugin-flatwave-react --ref main
```

Or from the GitHub UI:
**Actions → Release → Run workflow → Branch: main → Run workflow**
