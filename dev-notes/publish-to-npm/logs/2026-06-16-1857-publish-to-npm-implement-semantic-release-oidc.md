# 2026-06-16 18:57 -05 — publish-to-npm — implement semantic-release + OIDC

## What was done

- Created and switched to branch `feat/publish-to-npm` (off `main`, which is not pushable);
  the uncommitted `dev-notes/` artifacts carried over.
- Resolved risk **R1** via research (semantic-release npm plugin README, npm trusted-publishing
  docs, GitHub changelog, and real-world issues #1054/#1069 + PR ciqol/sonarqube-api-client#22):
  tokenless OIDC publishing works with `semantic-release@^25` (bundles OIDC-capable
  `@semantic-release/npm@^13.1`). `semantic-release@24`/plugin v12 hard-fails without a token.
- Implemented the release pipeline (code changes below).

## Files created / modified / deleted

- **Created** `.releaserc.json` (repo root): branches `main`; plugins commit-analyzer,
  release-notes-generator, npm (`pkgRoot: packages/vite-plugin-flatwave-react`), github.
- **Modified** `package.json` (root): added `semantic-release: ^25.0.0` devDependency and a
  `release: semantic-release` script.
- **Rewrote** `.github/workflows/release.yml`: trigger `push: main` + `workflow_dispatch`;
  permissions `contents/issues/pull-requests: write` + `id-token: write`; checkout
  `fetch-depth: 0`; Node 24; **no** `registry-url`; `npm ci` → `npm run build:plugin` →
  `npx semantic-release` with only `GITHUB_TOKEN`. Removed `NPM_TOKEN`, the patch bump,
  and the manual version commit/push.
- **Deleted** `packages/vite-plugin-flatwave-react/scripts/bump-patch-version.js` (via `git rm`;
  superseded by Conventional-Commits versioning).
- **Updated** plan + requirements status to "in implementation"; appended the finalized
  implementation decisions to the plan.

## Why / key decisions

- **No write-back to `main`** (dropped `@semantic-release/git` + committed `CHANGELOG.md`):
  `main` is not pushable, and semantic-release recommends tags + GitHub Releases as the source
  of truth rather than committing the version bump back. This also keeps the dependency
  footprint to just `semantic-release` (the other 4 plugins ship with its core).
- **Node 24 / no `registry-url`**: npm ≥ 11.5.1 is required for OIDC; `registry-url` injects an
  `.npmrc` that conflicts with semantic-release's OIDC auth (`EINVALIDNPMTOKEN`).

## Deviations from plan

- Plan §Approach originally listed `@semantic-release/changelog` + `@semantic-release/git` and a
  committed `CHANGELOG.md`; dropped per the no-write-back decision above. Recorded in the plan's
  "Implementation decisions" section.

## State

- **In progress.** Next: `npm install` to update `package-lock.json`, then validate
  (`build:plugin`, `npm pack --dry-run`, `semantic-release --dry-run`).
- **Manual (registry-side) steps still required** before automation can publish — see upcoming
  bootstrap doc: (1) one-time first publish to create the package on npm, (2) configure the
  Trusted Publisher on npmjs.com (repo `kamansoft/vite-plugin-flatwave-react`, workflow
  `release.yml`), (3) create baseline tag `v0.1.0`.
