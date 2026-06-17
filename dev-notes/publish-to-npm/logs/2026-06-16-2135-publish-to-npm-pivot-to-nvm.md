# 2026-06-16 21:35 -05 — publish-to-npm — Docker attempt → pivot to nvm

## What was done

1. **Docker attempt (per developer request to use the dev image for publish):**
   - Added `docker/release.Dockerfile` (`node:22-alpine` + `git`) and a `release` service to
     `docker/docker-compose.yml`; pointed both at a containerized dry-run.
   - Built the image (OK, ~24s) and ran the dry-run → **failed with `ENOGITREPO`**.
2. **Diagnosis:** initially suspected a git worktree, but `.git` here is a normal **directory**
   (`git rev-parse --git-dir` = `.git`, single entry in `git worktree list`). The container error
   is most consistent with git's **dubious-ownership** guard: the container runs as `root` over the
   host-owned bind mount, so `git` refuses the repo and semantic-release reports "not a git repo".
3. **Pivot to nvm (developer direction):** run local publish/dry-run on the host with a _momentary_
   `nvm use 24` (Node ≥ 22.14 / npm ≥ 11.5.1); the default Node is unchanged, nothing installed
   globally. CI release stays native on the runner.

## Files created / modified / deleted

- **Deleted** `docker/release.Dockerfile`; **reverted** the `release` service out of
  `docker/docker-compose.yml` → `docker/` has **no net change**.
- **Reverted** `dev-notes/publish-to-npm/scripts/dry-run-release.sh` to a host/nvm bash helper.
- **Created** `dev-notes/publish-to-npm/scripts/local-publish.sh` — momentary `nvm use 24`, build,
  `npm login` (if needed), `npm publish --workspace vite-plugin-flatwave-react --access public`;
  `--dry-run` packs instead of publishing.
- **Updated** `README.md` (Local dry-run → nvm), `bootstrap-and-trusted-publisher.md`
  (prereq + Step 1 → nvm/local-publish.sh), and requirements §4.5/FR9/AC9 + plan (nvm section,
  Docker rejected).

## Validation (host, Node 24.13.1 / npm 11.8.0 via nvm)

- `local-publish.sh --dry-run` → built plugin, packed `vite-plugin-flatwave-react@0.1.0`
  (24 files, 10.0 kB). ✔
- `dry-run-release.sh` → semantic-release 25.0.5 loaded all plugins and correctly declined to
  publish from `feat/publish-to-npm` ("configured to only publish from main"). ✔

## Deviations from plan

- FR9 originally specified Docker for local publish; replaced with nvm (recorded in requirements
  §4.5/FR9 and the plan's "Local execution via nvm" section). `docker/` left untouched.

## State

- **Implementation complete on `feat/publish-to-npm`** (not committed — awaiting go-ahead; no push
  without explicit approval per AGENTS.md).
- **Manual steps remain (maintainer):** run `local-publish.sh` for the first publish, configure the
  npm Trusted Publisher, and push baseline tag `v0.1.0` — see
  `dev-notes/publish-to-npm/bootstrap-and-trusted-publisher.md`.
