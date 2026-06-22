# Development Guide — `@kamansoft/vite-plugin-flatwave-react`

> Coding standards, tooling configuration, Git workflow, Docker environment, and automation details for contributors and maintainers.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Coding Standards](#coding-standards)
   - [SOLID Principles](#solid-principles)
   - [DRY Principle](#dry-principle)
   - [TypeScript Standards](#typescript-standards)
   - [Module and File Conventions](#module-and-file-conventions)
3. [Linting and Formatting](#linting-and-formatting)
   - [ESLint](#eslint)
   - [Prettier](#prettier)
   - [TypeScript Strict Mode](#typescript-strict-mode)
4. [Git Hooks with Husky](#git-hooks-with-husky)
   - [pre-commit — lint-staged](#pre-commit--lint-staged)
   - [commit-msg — commitlint](#commit-msg--commitlint)
5. [Git Workflow — Trunk-Based Development](#git-workflow--trunk-based-development)
   - [Branch Naming](#branch-naming)
   - [Squash Merge Strategy](#squash-merge-strategy)
   - [PR Title as Commit Message](#pr-title-as-commit-message)
6. [Automation — GitHub Actions](#automation--github-actions)
   - [CI Workflow (`ci.yml`)](#ci-workflow-ciyml)
   - [PR Title Validation (`pr-title.yml`)](#pr-title-validation-pr-titleyml)
   - [Release Workflow (`release.yml`)](#release-workflow-releaseyml)
   - [Semantic Versioning Rules](#semantic-versioning-rules)
7. [Docker Development Environment](#docker-development-environment)
   - [Why Docker](#why-docker)
   - [Available Services](#available-services)
   - [Common Docker Commands](#common-docker-commands)
8. [Installing the Package for Local Development](#installing-the-package-for-local-development)
   - [Using `npm link`](#using-npm-link)
   - [Using a `file:` dependency](#using-a-file-dependency)
9. [Running the Test Suite](#running-the-test-suite)
10. [Common Commands Reference](#common-commands-reference)

---

## Prerequisites

| Tool    | Minimum Version | Notes                                                           |
| ------- | --------------- | --------------------------------------------------------------- |
| Node.js | 22.0.0          | Specified in `engines` field. Use a version manager (nvm, fnm). |
| npm     | 10.0.0+         | Comes with Node.js 22. npm 11.5.1+ required for OIDC publish.   |
| Docker  | 24+             | Optional, but strongly recommended for consistent environments. |
| Git     | 2.34+           | Required for Husky hooks.                                       |

```bash
# Check your versions
node -v    # must be >= 22
npm -v
docker --version
```

---

## Coding Standards

### SOLID Principles

All modules in `packages/vite-plugin-flatwave-react/src/` are expected to follow SOLID principles. The current codebase applies these as:

#### Single Responsibility Principle (SRP)

Each file has one clearly defined concern:

| File                        | Single Responsibility                                             |
| --------------------------- | ----------------------------------------------------------------- |
| `scanner.ts`                | Discovers and parses Markdown files from disk                     |
| `indexer.ts`                | Builds the content index from parsed files                        |
| `routeBuilder.ts`           | Assembles routes and SEO metadata                                 |
| `validator.ts`              | Validates content rules (required fields, duplicates, components) |
| `markdownCompiler.ts`       | Converts Markdown to HTML via the `unified` pipeline              |
| `RenderPipeline.ts`         | Executes render hooks in sequence                                 |
| `DefaultRenderStrategy.tsx` | Implements one rendering strategy (React renderToString)          |
| `template.ts`               | Resolves and renders HTML templates                               |
| `metadata.ts`               | Generates HTML head tags and escapes values                       |
| `cli/validate.ts`           | Defines the CLI interface using Commander.js                      |

**Guideline:** If a file needs to import more than two or three unrelated modules, it is likely doing too much. Extract focused helpers into new files.

#### Open/Closed Principle (OCP)

The plugin is open for extension without modifying its core:

- **Custom render strategies**: Implement `RenderStrategy` and pass it via `ssg.strategy`. The core `runSsg.ts` never needs changing.
- **Custom hook phases**: Inject behaviour via `ssg.hooks` (beforeRender, transformMarkdown, transformHtml, afterRender, onError).
- **Custom templates**: Place an `index.html` file in `flatwave-templates/` in your project root. The template resolver checks this location before falling back to the built-in.
- **Custom Markdown plugins**: Pass `remarkPlugins` and `rehypePlugins` via `ssg.compileMarkdown`.

**Guideline:** New rendering capabilities should be added as strategies or hooks, not as conditional branches inside `runSsg.ts` or `DefaultRenderStrategy.tsx`.

#### Liskov Substitution Principle (LSP)

Any object implementing `RenderStrategy` can replace `DefaultRenderStrategy` without breaking the system:

```ts
interface RenderStrategy {
  render(context: RenderContext): Promise<string>;
}

// Custom strategy — fully substitutable
class MyCustomStrategy implements RenderStrategy {
  async render(context: RenderContext): Promise<string> {
    // Can perform async data fetching, use a different renderer, etc.
    return `<div>${context.contentEntry.body}</div>`;
  }
}
```

**Guideline:** When implementing new strategies or adapters, the return types and promise semantics must be preserved.

#### Interface Segregation Principle (ISP)

Types are split into focused interfaces rather than one large blob:

- `FlatwaveContentOptions` — user-facing plugin configuration
- `SsgOptions` — SSG-specific configuration
- `RenderHooks` — hook phase functions
- `TemplateOverrides` — template file overrides
- `MarkdownCompilerOptions` — markdown pipeline configuration
- `SeoMetadata` — SEO head tag data
- `FlatwaveFrontmatter` — front-matter schema
- `FlatwaveContentEntry` — processed content item
- `FlatwaveRoute` — route with metadata

**Guideline:** When adding new configuration, add it to the most specific interface, not to `FlatwaveContentOptions` directly. Create a new focused interface when the grouping doesn't exist yet.

#### Dependency Inversion Principle (DIP)

High-level orchestration code depends on abstractions, not concrete implementations:

- `runSsg.ts` accepts `RenderStrategy` (interface), not `DefaultRenderStrategy` (class)
- `RenderPipeline.ts` works with typed hook function signatures, not specific hook implementations
- `flatwaveContent()` factory receives `FlatwaveContentOptions` (the public API shape)

**Guideline:** Avoid `import`ing concrete classes from orchestrators. Depend on interface types from `types.ts` instead.

---

### DRY Principle

The codebase avoids repetition through shared utilities:

- **`scanner.ts`** is the single location for Markdown file discovery. Both `indexer.ts` and `validator.ts` call `scanMarkdownFiles()` instead of each implementing their own glob logic.
- **`routeBuilder.ts`** owns route assembly. Both `indexer.ts` and `validator.ts` call `buildContentIndex()`.
- **`normalizeSlug()`** in `scanner.ts` is the single source of truth for slug normalization.
- **`escapeHtml()`** in `metadata.ts` is the single escape function — never inline string escaping elsewhere.
- **`types.ts`** is the single location for all shared TypeScript interfaces. Never duplicate type definitions across files.
- **Virtual module string** in `index.ts` is generated once via `createVirtualModule()` and reused by both the `resolveId`/`load` hooks and the `handleHotUpdate` rebuilds.

**Guideline:** Before writing a new utility function, check if one already exists in `scanner.ts`, `routeBuilder.ts`, or `metadata.ts`. If you find yourself copying code between files, extract a shared helper.

---

### TypeScript Standards

- **Strict mode is enabled** in all `tsconfig.json` files (`"strict": true`). This enforces `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, and more.
- **No `any`** — `@typescript-eslint/no-explicit-any` is set to `warn`. Every `unknown` cast should be explained with a comment.
- **Explicit return types** on exported functions — consumers of the package benefit from clear signatures in generated `.d.ts` files.
- **`satisfies` operator** — use `satisfies` for type validation on object literals to preserve the literal type while catching type errors (e.g., `} satisfies FlatwaveContentEntry`).
- **ESM imports with extensions** — all relative imports must include the `.js` extension in source (even for `.ts` files), because the compiled output is ESM.

```ts
// Correct (ESM-compatible import in .ts source)
import { buildContentIndex } from './routeBuilder.js';

// Incorrect (will fail in ESM at runtime)
import { buildContentIndex } from './routeBuilder';
```

- **Target**: `ES2022`, module: `ESNext`, moduleResolution: `Bundler`.

---

### Module and File Conventions

- One exported function/class per file whenever the file's purpose is a single unit of work.
- Side-effect-free modules — files should not execute code at import time (no top-level `await` outside `main()` functions).
- File names use `camelCase` for modules, `PascalCase` for React components and classes.
- Test files colocated with the module they test using the `.test.ts` suffix (e.g., `markdownCompiler.test.ts`).

---

## Linting and Formatting

### ESLint

Configuration: `eslint.config.mjs` (flat config format, ESLint 9+)

The config extends:

- `@eslint/js` recommended rules
- `typescript-eslint` recommended rules
- `eslint-plugin-prettier` (treats Prettier formatting as ESLint errors)
- `eslint-plugin-react` (disables `react/react-in-jsx-scope` since React 17+)

**Rules enforced:**

| Rule                                 | Severity | Meaning                                      |
| ------------------------------------ | -------- | -------------------------------------------- |
| `prettier/prettier`                  | error    | All Prettier formatting issues fail CI       |
| `@typescript-eslint/no-unused-vars`  | error    | Unused variables fail (except `_`-prefixed)  |
| `@typescript-eslint/no-explicit-any` | warn     | Explicit `any` produces a warning            |
| `react/react-in-jsx-scope`           | off      | No need to import React in scope (React 17+) |

**Run manually:**

```bash
# Check all files
npm run lint

# Auto-fix what ESLint can fix
npx eslint . --ext .ts,.tsx,.js,.jsx --fix
```

**Ignored paths** (from `eslint.config.mjs`):

- `node_modules/`
- `**/dist/`
- `**/*.config.js` and `**/*.config.ts`
- `.husky/`
- `**/examples/*/dist/`
- `**/scripts/`

---

### Prettier

Prettier handles all formatting. ESLint's `prettier/prettier` rule means **any Prettier deviation is a lint error**.

```bash
# Format all files
npm run format

# Check without writing (used in CI)
npm run format:check
```

`lint-staged` (on `pre-commit`) also auto-formats staged files before they are committed, so in practice manual formatting runs are rare.

---

### TypeScript Strict Mode

```bash
# Type-check without emitting files
npm run type-check

# Internally runs:
# tsc --noEmit -p packages/vite-plugin-flatwave-react/tsconfig.build.json
# tsc --noEmit -p examples/basic-react-site/tsconfig.json
```

TypeScript errors block the `validate` CI job, which in turn blocks the release.

---

## Git Hooks with Husky

Husky is configured in `.husky/` and is initialized via the `prepare` lifecycle script (`"prepare": "husky"`). After running `npm install`, hooks are installed automatically.

```bash
# Manually re-install hooks (if needed)
npx husky
```

### pre-commit — lint-staged

File: `.husky/pre-commit`

```sh
npx lint-staged --config .lintstagedrc.json
```

`lint-staged` runs only on **staged files** matching the globs in `.lintstagedrc.json`:

```json
{
  "packages/**/*.{ts,tsx,js,jsx}": ["eslint --fix --config eslint.config.mjs", "prettier --write"],
  "examples/**/*.{ts,tsx,js,jsx}": ["eslint --fix --config eslint.config.mjs", "prettier --write"],
  "packages/**/*.{json,md,yml,yaml}": ["prettier --write"],
  "examples/**/*.{json,md,yml,yaml}": ["prettier --write"],
  "*.{json,md,yml,yaml}": ["prettier --write"]
}
```

**Behaviour**: ESLint fixes and Prettier re-formats the staged files in place, then re-stages them. If ESLint reports an unfixable error, the commit is aborted.

### commit-msg — commitlint

File: `.husky/commit-msg`

```sh
npx commitlint --edit "$1"
```

Enforces Conventional Commits format according to `commitlint.config.js`:

| Rule             | Value                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------- |
| Allowed types    | `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`, `build`, `ci` |
| Scope case       | `kebab-case`                                                                                 |
| Subject case     | `sentence-case`                                                                              |
| Subject required | Yes                                                                                          |
| Type required    | Yes                                                                                          |

**Valid commit examples:**

```
feat(content): add support for nested locale directories
fix(ssg): handle missing component gracefully
docs: update architecture diagrams
chore: upgrade vitest to v3
```

**Invalid examples:**

```
Added feature        ← missing type
feat: Added feature  ← subject should be sentence-case, not title-case (Wait — sentence-case allows initial cap)
FEAT: do thing       ← type must be lowercase
```

To disable Husky in CI (where hooks are not needed and would slow things down):

```bash
HUSKY=0 npm ci
HUSKY=0 npm run validate
```

---

## Git Workflow — Trunk-Based Development

This project uses **trunk-based development** with `main` as the single long-lived branch. There are no permanent `develop`, `release`, or `hotfix` branches.

```
main  ──────────────────────────────────────────────────► (always releasable)
        ▲                ▲                ▲
        │ squash merge   │ squash merge   │ squash merge
  feat/my-feature   fix/broken-thing   docs/update-readme
  (short-lived)     (short-lived)      (short-lived)
```

### Branch Naming

Feature branches are created from `main` and deleted after merge:

```
feat/<short-description>
fix/<short-description>
docs/<short-description>
chore/<short-description>
refactor/<short-description>
ci/<short-description>
```

Examples:

- `feat/ssg-pre-rendering-support`
- `fix/documentation`
- `chore/upgrade-vitest`

### Squash Merge Strategy

**Only squash merges are allowed** (merge commits and rebase are disabled in GitHub repository settings). This means:

- Every PR produces exactly **one commit** on `main`
- The commit message equals the PR title (configured in GitHub: "Default to PR title for squash merge commits")
- `main` history stays linear and readable

### PR Title as Commit Message

Because GitHub is configured to use the PR title as the squash commit message, **the PR title is the actual commit that drives semantic versioning**. The PR Title Validation workflow enforces Conventional Commits format on every PR open/edit before it can be merged.

```
PR Title: "feat(ssg): add extensible render strategy API"
         ↓ squash merge
Commit on main: "feat(ssg): add extensible render strategy API"
                ↓ semantic-release
Version bump: minor (e.g. 1.1.0 → 1.2.0)
```

**Direct pushes to `main` are not allowed** — branch protection rules enforce this for all users including org admins (`enforce_admins: true`).

---

## Automation — GitHub Actions

Three workflow files live in `.github/workflows/`.

### CI Workflow (`ci.yml`)

**Triggers:** Pull requests targeting `main`.

**Jobs:**

```
validate (Node 22)
  └─ checkout → setup-node → npm ci → npm run validate
       │
       └─ npm run validate runs:
            1. prettier --check .   (format:check)
            2. eslint .             (lint)
            3. tsc --noEmit         (type-check)
            4. npm run build        (build:plugin + build:example)
            5. vitest run           (unit + integration tests)

test-matrix (Node 22, Node 24)
  └─ Same as validate, matrix-expanded to two Node versions
```

**Status checks required before merge** (branch protection):

- `validate`
- `test-matrix (22)`
- `test-matrix (24)`
- `Validate PR Title`

All four must be green to unlock the merge button.

**Why `HUSKY: 0`?** Husky hooks are installed via `npm ci` but must not run in CI. The `HUSKY=0` environment variable tells Husky to skip installing/running hooks.

---

### PR Title Validation (`pr-title.yml`)

**Triggers:** Pull request events: `opened`, `edited`, `reopened`, `synchronize`.

**Uses:** [`amannn/action-semantic-pull-request@v5`](https://github.com/amannn/action-semantic-pull-request)

**Enforced rules:**

- Title must start with one of: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`, `build`, `ci`
- Scope is optional (not required)
- Subject (everything after `type:` or `type(scope):`) must be ≤ 100 characters

This check is a **required status check** — failing it locks the merge button.

---

### Release Workflow (`release.yml`)

**Triggers:** Push to `main` (i.e., every merged PR) and manual `workflow_dispatch`.

**Concurrency:** `cancel-in-progress: false` — a running release is never killed. Only one release runs at a time per branch.

**Jobs:**

```
ci (CI gate — re-runs full validation on main)
  └─ checkout → setup-node → npm ci → npm run validate

release (only runs if ci job passes)
  └─ checkout (full history: fetch-depth: 0)
  → setup-node (node 22, NO registry-url)
  → npm install -g npm@latest  (upgrade to npm >=11.5.1 for OIDC)
  → npm ci
  → npm run build:plugin
  → npx semantic-release
       │
       ├─ @semantic-release/commit-analyzer   → determines version bump
       ├─ @semantic-release/release-notes-generator → generates changelog
       ├─ @semantic-release/npm               → publishes to npm (pkgRoot: packages/vite-plugin-flatwave-react)
       └─ @semantic-release/github            → creates GitHub Release + tag
```

**Permissions required by the `release` job:**

| Permission             | Why                                               |
| ---------------------- | ------------------------------------------------- |
| `contents: write`      | Create git tag `vX.Y.Z` and GitHub Release        |
| `id-token: write`      | npm OIDC trusted publishing (no NPM_TOKEN secret) |
| `issues: write`        | semantic-release comments on released issues      |
| `pull-requests: write` | semantic-release comments on released PRs         |

**Why `registry-url` is intentionally omitted from `setup-node`:**

When `registry-url` is set, `setup-node` writes an `.npmrc` containing `${NODE_AUTH_TOKEN}`. This conflicts with `@semantic-release/npm`'s own `.npmrc` management and causes `EINVALIDNPMTOKEN` errors. The OIDC token is exchanged automatically by npm ≥11.5.1 using the `id-token: write` permission.

---

### Semantic Versioning Rules

| Commit type on `main`                                             | Semver bump | Example         |
| ----------------------------------------------------------------- | ----------- | --------------- |
| `feat:` or `feat(scope):`                                         | **minor**   | `1.1.0 → 1.2.0` |
| `fix:` or `fix(scope):`                                           | **patch**   | `1.2.0 → 1.2.1` |
| `feat!:` or any type with `BREAKING CHANGE:` in body              | **major**   | `1.2.1 → 2.0.0` |
| `chore:`, `docs:`, `ci:`, `style:`, `test:`, `refactor:`, `perf:` | **none**    | no release      |

`semantic-release` analyses all commits since the previous `vX.Y.Z` tag. If no release-worthy commit is found, no version is published.

The `@semantic-release/npm` plugin publishes the contents of `packages/vite-plugin-flatwave-react/` (specified via `pkgRoot`). The `package.json` `version` field is bumped in place before publishing.

---

## Docker Development Environment

### Why Docker

The Docker environment eliminates "works on my machine" problems by:

- Pinning Node.js to the exact `node:22-alpine` image
- Isolating `node_modules` from the host via a named Docker volume
- Providing `nginx` with a pre-configured SPA fallback for testing the static site build

All services are defined in `docker/docker-compose.yml` with the build context set to the repository root.

### Available Services

| Service  | What it does                                              | Port   |
| -------- | --------------------------------------------------------- | ------ |
| `dev`    | Installs deps, starts the Vite dev server with hot-reload | `8080` |
| `build`  | Installs deps, runs `npm run build` (plugin + example)    | —      |
| `static` | Serves the built `dist/` with nginx (SPA fallback)        | `4173` |

**Service dependency:** `static` depends on `build` completing first.

**Volume strategy:** The `dev` and `build` services mount the repo root as `/app` but exclude `/app/node_modules` via an anonymous volume. This prevents the host's `node_modules` from being used inside the container (or vice versa).

### Common Docker Commands

```bash
# ── Dev server (hot-reload) ──────────────────────────────────────────────────
docker compose -f docker/docker-compose.yml up dev
# Open http://localhost:8080

# ── Production build ──────────────────────────────────────────────────────────
docker compose -f docker/docker-compose.yml up build

# ── Serve the static build with nginx ─────────────────────────────────────────
docker compose -f docker/docker-compose.yml up static
# Open http://localhost:4173/es/about

# ── Rebuild images (after changing Dockerfiles or package.json) ───────────────
docker compose -f docker/docker-compose.yml build

# ── Stop and remove containers ────────────────────────────────────────────────
docker compose -f docker/docker-compose.yml down

# ── Run a one-off command inside the dev container ────────────────────────────
docker compose -f docker/docker-compose.yml run --rm dev npm run lint
docker compose -f docker/docker-compose.yml run --rm dev npm run type-check
```

**Nginx configuration** (`docker/nginx.conf`) serves files from `/usr/share/nginx/html` with a `try_files $uri $uri/ /index.html` fallback for SPA routing. The static site generated by this plugin has one `index.html` per route folder (`/es/about/index.html`), so the fallback is only triggered when a route folder does not exist.

---

## Installing the Package for Local Development

When you want to use an **unreleased local build** of the plugin in another React project (before publishing to npm), you have two options.

### Using `npm link`

`npm link` creates a symlink from the global npm store into your project's `node_modules`. Changes to the plugin's `dist/` are immediately available in the consuming project without reinstalling.

**Step 1 — build and link the plugin:**

```bash
# In the plugin monorepo root
npm run build:plugin

# In the plugin package directory
cd packages/vite-plugin-flatwave-react
npm link
```

**Step 2 — link the package in your React project:**

```bash
# In your consuming React project
npm link @kamansoft/vite-plugin-flatwave-react
```

**Step 3 — rebuild on changes:**

```bash
# In the monorepo root — run after every code change
npm run build:plugin
```

**Step 4 — unlink when done:**

```bash
# In your consuming project
npm unlink @kamansoft/vite-plugin-flatwave-react

# In the plugin package directory
npm unlink
```

> **Note:** `npm link` relies on symlinks. Some tools (Vite, Jest, certain bundlers) may not follow symlinks by default. If you encounter module resolution issues, use the `file:` dependency approach instead.

### Using a `file:` dependency

A more reliable alternative is to reference the local package path directly in your project's `package.json`:

**Step 1 — build the plugin:**

```bash
# In the monorepo root
npm run build:plugin
```

**Step 2 — add the `file:` dependency to your project:**

```json
// your-react-project/package.json
{
  "dependencies": {
    "@kamansoft/vite-plugin-flatwave-react": "file:../vite-plugin-flatwave-react/packages/vite-plugin-flatwave-react"
  }
}
```

**Step 3 — install in your project:**

```bash
# In your consuming React project
npm install
```

**Step 4 — rebuild on plugin changes:**

After modifying the plugin source, rebuild and reinstall:

```bash
# 1. Rebuild
cd /path/to/vite-plugin-flatwave-react && npm run build:plugin

# 2. Reinstall in your project (npm will copy the dist/ snapshot)
cd /path/to/your-project && npm install
```

> **Tip:** Unlike `npm link`, a `file:` dependency copies the package into `node_modules` at install time. You need to re-run `npm install` in the consuming project after every plugin rebuild.

**When the package is published to npm**, replace the `file:` reference with the version specifier:

```json
{
  "dependencies": {
    "@kamansoft/vite-plugin-flatwave-react": "^2.0.1"
  }
}
```

---

## Running the Test Suite

```bash
# All tests (unit + integration)
npm run test

# End-to-end tests (builds everything, starts a static server, runs assertions)
npm run test:e2e

# Watch mode (useful during development)
npx vitest

# Run a specific test file
npx vitest run e2e/example.test.ts
```

The e2e suite (`e2e/example.test.ts`) performs the complete build → serve → HTTP request cycle:

1. `npm run build -w @kamansoft/vite-plugin-flatwave-react`
2. `npm run build -w @flatwave/example-basic-react-site`
3. Spawns `npx serve dist -l 4173` (static file server)
4. Waits up to 20 seconds for the server to be ready
5. Asserts HTML files exist, contain correct `lang` attributes and titles, sitemap/robots/manifest are generated correctly, and the validation CLI exits 0

---

## Common Commands Reference

| Command                                                 | What it does                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------------ |
| `npm run build:plugin`                                  | Compile `packages/vite-plugin-flatwave-react` → `dist/`                  |
| `npm run build:example`                                 | Build `examples/basic-react-site` using the local plugin                 |
| `npm run build`                                         | Both of the above                                                        |
| `npm run lint`                                          | ESLint across all packages                                               |
| `npm run format`                                        | Prettier writes all files                                                |
| `npm run format:check`                                  | Prettier checks without writing (CI mode)                                |
| `npm run type-check`                                    | TypeScript type checking without emitting                                |
| `npm run test`                                          | Vitest unit + integration tests                                          |
| `npm run test:e2e`                                      | End-to-end build + serve + assert                                        |
| `npm run validate`                                      | `format:check` + `lint` + `type-check` + `build` + `test` (full CI gate) |
| `npm run validate:example`                              | Run `flatwave-validate` CLI against the example content                  |
| `npm run dev -w @flatwave/example-basic-react-site`     | Start Vite dev server on port 8080                                       |
| `npm run preview -w @flatwave/example-basic-react-site` | Serve production build on port 4173                                      |
