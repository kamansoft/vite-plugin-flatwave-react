# Bootstrap & Trusted Publisher setup (manual, one-time)

These steps are **manual** and require maintainer credentials (npm + GitHub admin). They are
**not** automatable in this repo and must be done **before the first automated release runs**,
because npm Trusted Publishing requires the package to already exist on the registry.

> Order matters: complete steps 1–3 **before** merging `feat/publish-to-npm` into `main`.
> Otherwise the first `release.yml` run will fail at the publish step (no package + no trusted
> publisher configured yet).

## Prerequisites

- An npm account that may publish `vite-plugin-flatwave-react` (the name is currently free).
- Admin on the GitHub repo `kamansoft/vite-plugin-flatwave-react`.
- nvm with Node ≥ 22.14 installed (`nvm install 24`); the publish helper switches to it momentarily — your default Node is untouched.

## Step 1 — First publish (claim the package on npm)

Run the one-time publish from the host with the helper script, which momentarily switches to
Node 24 via nvm (your default Node is unchanged). Provenance can only be generated from CI, so
this bootstrap publish is a plain publish without provenance:

```bash
# Builds the plugin, runs `npm login` if you are not authenticated, then publishes 0.1.0.
dev-notes/publish-to-npm/scripts/local-publish.sh

# Verify
npm view vite-plugin-flatwave-react version   # should now resolve to 0.1.0
```

Preview first without publishing: `dev-notes/publish-to-npm/scripts/local-publish.sh --dry-run`.

(Alternative: publish from any host/CI with a short-lived npm automation token via
`NODE_AUTH_TOKEN`, then revoke it. Interactive `npm login` is simpler for a one-time publish.)

## Step 2 — Configure the Trusted Publisher on npmjs.com

On npmjs.com → **Packages → vite-plugin-flatwave-react → Settings → Trusted Publisher** →
**GitHub Actions**, set:

- **Organization / user:** `kamansoft`
- **Repository:** `vite-plugin-flatwave-react`
- **Workflow filename:** `release.yml` (filename only, must live in `.github/workflows/`)
- **Environment:** leave blank (the workflow does not use a GitHub Environment)

This authorizes the workflow to publish via OIDC with no token.

## Step 3 — Create the baseline version tag

semantic-release derives the next version from the latest reachable tag. With no tag it would
start the first automated release at `1.0.0`. To continue the current 0.x line, tag the commit
that corresponds to the published `0.1.0`:

```bash
git tag v0.1.0
git push origin v0.1.0     # tags are a separate ref from the protected main branch
```

If pushing tags is also restricted, create the tag/release via the GitHub UI
(Releases → Draft a new release → tag `v0.1.0`).

## Step 4 — (Recommended) lock down token publishing

Once trusted publishing works, harden the package on npmjs.com →
**Settings → Publishing access → "Require two-factor authentication and disallow tokens"**.
Trusted publishing keeps working (it uses OIDC, not tokens).

## Step 5 — Verify the automation

1. Merge `feat/publish-to-npm` into `main` (use a Conventional-Commit title/commit, e.g.
   `feat: automate npm publishing via semantic-release + OIDC`).
2. Watch the **Release** workflow run: it should analyze commits, publish the next version with
   provenance via OIDC, and create the tag + GitHub Release.
3. Confirm on npm: `npm view vite-plugin-flatwave-react` shows the new version with a provenance
   badge.

## Notes

- No `NPM_TOKEN` secret is needed once trusted publishing is configured. The workflow has
  `id-token: write` and runs on Node 24 (npm ≥ 11.5.1), the minimum for OIDC.
- Provenance requires a **public** repo and a **public** package (both true here).
