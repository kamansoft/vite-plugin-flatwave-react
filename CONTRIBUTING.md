# Contributing to `@kamansoft/vite-plugin-flatwave-react`

Thank you for taking the time to contribute! All kinds of contributions are welcome: bug reports, documentation improvements, new features, and code reviews.

Before you start, please read this guide — it will save you and the maintainers time and make the whole experience smoother.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [I Have a Question](#i-have-a-question)
3. [Reporting a Bug](#reporting-a-bug)
4. [Suggesting an Enhancement](#suggesting-an-enhancement)
5. [Your First Code Contribution](#your-first-code-contribution)
   - [Setting Up the Development Environment](#setting-up-the-development-environment)
   - [Making Changes](#making-changes)
6. [Pull Request Process](#pull-request-process)
   - [PR Title — Conventional Commits](#pr-title--conventional-commits)
   - [Quality Gates — All Must Pass](#quality-gates--all-must-pass)
   - [Review and Merge](#review-and-merge)
7. [Commit Message Convention](#commit-message-convention)
8. [Coding Standards](#coding-standards)
9. [Testing Requirements](#testing-requirements)
10. [Documentation Contributions](#documentation-contributions)
11. [Release Process (Maintainers)](#release-process-maintainers)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating you agree to uphold it. Unacceptable behaviour can be reported to the maintainers via a GitHub issue marked **[private]**.

---

## I Have a Question

Before opening an issue:

1. Read the [README](./README.md) and the [docs/](./docs/) folder.
2. Search [existing issues](https://github.com/kamansoft/vite-plugin-flatwave-react/issues) — your question may already be answered.

If you still need help, open an [issue](https://github.com/kamansoft/vite-plugin-flatwave-react/issues/new) using the **Question** label. Include:

- Your Node.js version (`node -v`)
- Your npm version (`npm -v`)
- A minimal reproduction (the `examples/basic-react-site` is a good starting point)
- Any relevant error output

---

## Reporting a Bug

Open an issue with the **Bug** label. A useful bug report includes:

1. **What you expected to happen.**
2. **What actually happened** — paste the full error message and stack trace.
3. **Steps to reproduce** — a minimal repository or a snippet is ideal.
4. **Environment:**
   - OS and version
   - Node.js version (`node -v`)
   - npm version (`npm -v`)
   - Plugin version
   - Vite version

> **Security vulnerabilities** — do **not** open a public issue. Contact the maintainers privately via a GitHub Security Advisory.

---

## Suggesting an Enhancement

Open an issue with the **Enhancement** label. Describe:

1. **The problem you are trying to solve** — link to existing issues if relevant.
2. **Your proposed solution** — API shape, configuration changes, or behaviour change.
3. **Alternatives you have considered.**

Complex features (new hook phases, new public exports, breaking changes) benefit from a short design discussion in the issue before code is written.

---

## Your First Code Contribution

### Setting Up the Development Environment

**Option A — Docker (recommended, avoids Node version conflicts)**

```bash
git clone https://github.com/kamansoft/vite-plugin-flatwave-react.git
cd vite-plugin-flatwave-react

# Start the dev server with hot-reload inside Docker
docker compose -f docker/docker-compose.yml up dev
# → open http://localhost:8080
```

**Option B — Local Node.js (Node 22+ required)**

```bash
git clone https://github.com/kamansoft/vite-plugin-flatwave-react.git
cd vite-plugin-flatwave-react

# Install all workspace dependencies (plugin + example + dev tooling)
npm install

# Build the plugin once before using the example
npm run build:plugin

# Start the example dev server
npm run dev -w @flatwave/example-basic-react-site
# → open http://localhost:8080
```

Husky Git hooks are installed automatically by the `prepare` script during `npm install`.

See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) for full environment details, Docker commands, and how to link the plugin into another project.

---

### Making Changes

1. **Fork the repository** and clone your fork locally.

2. **Create a branch from `main`** using the relevant prefix:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/my-feature
   # or fix/my-fix, docs/my-docs, refactor/my-refactor, etc.
   ```

3. **Make your changes.** Keep each branch focused on one logical change.

4. **Run the full validation suite before committing:**

   ```bash
   npm run validate
   # Runs: format:check → lint → type-check → build → test
   ```

   All five steps must pass. Fix any errors or warnings before continuing.

5. **Commit your changes** using a Conventional Commit message (see [Commit Message Convention](#commit-message-convention)):

   ```bash
   git commit -m "feat(content): add support for nested locale subdirectories"
   ```

   The `commit-msg` Husky hook validates the format. If it rejects your message, adjust the type/subject and try again.

6. **Push your branch** and open a Pull Request targeting `main`.

---

## Pull Request Process

### PR Title — Conventional Commits

The **PR title** must follow [Conventional Commits](https://www.conventionalcommits.org/) format because GitHub is configured to use it as the squash-merge commit message, which `semantic-release` uses to determine the version bump:

```
type(scope): short description in sentence case
```

| PR title example                                          | Version bump |
| --------------------------------------------------------- | ------------ |
| `feat(ssg): add custom render strategy support`           | minor        |
| `fix(validator): handle missing componentsDir gracefully` | patch        |
| `feat!: remove deprecated renderMode option`              | major        |
| `docs: update architecture diagrams`                      | none         |
| `chore: upgrade vitest to v3`                             | none         |
| `refactor(indexer): extract buildAlternatives helper`     | none         |

**Allowed types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`, `build`, `ci`

**Subject rules:**

- Use sentence case (first word capitalized, the rest lowercase)
- ≤ 100 characters
- No period at the end

The **PR Title Validation** GitHub Actions workflow checks your title automatically. A failing check blocks the merge button.

---

### Quality Gates — All Must Pass

Every PR must pass **all four** status checks before it can be merged:

| Check                | What it runs                      |
| -------------------- | --------------------------------- |
| `Validate PR Title`  | Conventional Commits title format |
| `validate` (Node 22) | `npm run validate` — full suite   |
| `test-matrix (22)`   | `npm run validate` on Node 22     |
| `test-matrix (24)`   | `npm run validate` on Node 24     |

`npm run validate` is the full gate and runs:

```bash
npm run format:check   # Prettier formatting
npm run lint           # ESLint (max-warnings 0)
npm run type-check     # TypeScript strict
npm run build          # build:plugin + build:example
npm run test           # vitest unit + integration
```

**Run it locally before pushing:**

```bash
npm run validate
```

Fix every error before opening or updating a PR. The CI environment mirrors what `npm run validate` does locally — if it passes locally with the correct Node.js version, it will pass in CI.

---

### Review and Merge

- PRs are reviewed by at least one maintainer.
- Feedback is given as inline review comments. Resolve requested changes before the PR can be approved.
- Once approved and all checks are green, a maintainer squash-merges the PR. The PR title becomes the commit on `main`.
- **Do not merge your own PRs** unless you are a maintainer and there are no other available reviewers.
- After merge, the branch is deleted automatically.

---

## Commit Message Convention

Individual commits inside a PR branch do **not** need to follow Conventional Commits format — only the final PR title (which becomes the squash commit) matters for versioning.

However, for clarity and to keep the `commit-msg` hook happy during development, write commits as:

```
type(scope): subject in sentence case

Optional body: explain the why, not the what.

Optional footer:
BREAKING CHANGE: describe the breaking change here
Refs: #42
```

The Husky `commit-msg` hook enforces this on every local commit. If you are working on a WIP commit, you can bypass the hook with `--no-verify` (but do **not** use this for final commits):

```bash
git commit -m "wip: rough implementation" --no-verify
```

---

## Coding Standards

All code changes must adhere to the standards described in [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md). Key highlights:

- **TypeScript strict mode** — no implicit `any`, no unsafe assertions without justification.
- **ESM imports with `.js` extension** — required even in `.ts` source files.
- **SOLID principles** — single responsibility per file, depend on interfaces from `types.ts`.
- **DRY** — reuse `scanner.ts`, `routeBuilder.ts`, and `metadata.ts` utilities; do not duplicate logic.
- **No side effects at module level** — files must not execute code on import.
- **File naming:** `camelCase` for modules, `PascalCase` for React components and classes.

ESLint and Prettier enforce most rules automatically. Run:

```bash
# Auto-fix ESLint issues and format files
npx eslint . --ext .ts,.tsx,.js,.jsx --fix
npm run format
```

---

## Testing Requirements

All contributions that change behaviour must include or update tests.

| Type             | Location                                | Command            |
| ---------------- | --------------------------------------- | ------------------ |
| Unit tests       | Colocated with the module (`*.test.ts`) | `npm run test`     |
| End-to-end tests | `e2e/example.test.ts`                   | `npm run test:e2e` |

**Unit tests** cover individual functions in the content pipeline and SSG modules. Use Vitest. Example patterns:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeSlug, routeForLocaleSlug } from '../src/content/scanner.js';

describe('normalizeSlug', () => {
  it('strips leading and trailing slashes', () => {
    expect(normalizeSlug('/about/')).toBe('/about');
  });

  it('prepends a slash to bare slugs', () => {
    expect(normalizeSlug('about')).toBe('/about');
  });
});
```

**End-to-end tests** build the plugin and example site, start a static server, and make HTTP assertions. They are slow (60–120 s) but verify the complete build → serve → HTTP cycle.

Run the full test suite before opening a PR:

```bash
npm run test        # unit + integration
npm run test:e2e    # end-to-end (optional for non-SSG changes, required for SSG changes)
```

---

## Documentation Contributions

Documentation improvements are always welcome, including:

- Fixing typos, grammar, or broken links in any `.md` file
- Adding examples to [docs/Architecture.md](./docs/Architecture.md)
- Extending [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) with common troubleshooting entries
- Updating the [README.md](./README.md) when the API changes

Documentation-only changes use the `docs:` commit type and **do not trigger a release** (`semantic-release` ignores `docs:` commits).

```bash
git checkout -b docs/improve-architecture-diagrams
# make changes
git commit -m "docs: add SSG sequence diagram for hook phases"
```

---

## Release Process (Maintainers)

Releases are **fully automated**. Maintainers do not manually bump versions, tag, or publish.

When a PR is merged into `main`:

1. The `release.yml` workflow fires.
2. A **CI gate job** re-runs `npm run validate` on `main`.
3. If CI passes, **`semantic-release`** runs:
   - Analyses commits since the last `vX.Y.Z` tag.
   - If at least one `feat:` or `fix:` commit is found, calculates the next version.
   - Bumps `packages/vite-plugin-flatwave-react/package.json`.
   - Builds the plugin with `npm run build:plugin`.
   - Publishes to npmjs.com via OIDC (no token stored — uses GitHub's short-lived identity token).
   - Creates a `vX.Y.Z` git tag.
   - Opens a GitHub Release with auto-generated release notes.

No action required from maintainers beyond merging the PR with the correct title.

For the initial package bootstrap or troubleshooting, see [docs/ci-cd-release-automation.md](./docs/ci-cd-release-automation.md).
