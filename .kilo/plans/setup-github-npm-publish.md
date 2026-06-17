# Setup GitHub Workflow for NPM Publishing + Conventional Commits + Husky + CI Validation

## Context
- Successfully published first version of `vite-plugin-flatwave-react` to npm
- NPM_TOKEN already saved in GitHub repository secrets
- Current workflow uses semantic-release with OIDC trusted publishing (requires Node 24+)
- Need to switch to NPM_TOKEN authentication
- Need to enforce Conventional Commits via Husky + commitlint
- Need PR title validation workflow
- **Version bumping based on PR TITLE (not individual commits)**
- **CI pipeline must run same validations as Husky: lint, format, type-check, build, test**
- **Development uses Node.js 22 LTS (Jod) on Docker - already configured**
- **Package must be compatible with Node.js 22 LTS for third-party consumers**
- **All validation must work from Docker development environment**

---

## Research Findings

### Node.js 22 LTS Status (as of 2026-06)
| Version | Status | Codename | Active LTS Start | Maintenance Start | End-of-Life |
|---------|--------|----------|------------------|-------------------|-------------|
| 22.x | **Maintenance LTS** | Jod | 2024-10-29 | 2025-10-21 | **2027-04-30** |

- Node 22 is in **Maintenance LTS** until April 2027 - still supported for security/critical fixes
- Docker images already use `node:22-alpine` ✓
- Vite 6 requires `node: ^18.0.0 || ^20.0.0 || >=22.0.0` - compatible ✓
- TypeScript target ES2022 - compatible with Node 22 ✓
- Package `engines: ">=18.0.0"` allows broad compatibility; could tighten to `>=22.0.0` if desired

### GitHub Actions setup-node
- Supports `node-version: '22'` or `'lts/jod'` for Node 22 LTS
- Matrix strategy recommended for testing multiple versions
- `registry-url` + `NPM_TOKEN` for npm authentication

### release-please (Google)
- Uses PR titles (not commits) for version determination
- Maps: `fix:` → patch, `feat:` → minor, `!`/`BREAKING CHANGE` → major
- Creates release PRs automatically with changelogs
- Recommended over semantic-release for PR-title-based versioning

### Husky v9
- Use `"prepare": "husky"` in package.json
- Hooks in `.husky/pre-commit`, `.husky/commit-msg`
- Disable in CI with `HUSKY=0`
- Works with lint-staged for staged files only

---

## Tasks

### 1. Create Root .gitignore
**File:** `.gitignore` (root)
```gitignore
node_modules/
dist/
*.log
.DS_Store
```

### 2. Create Package .gitignore
**File:** `packages/vite-plugin-flatwave-react/.gitignore`
```gitignore
node_modules/
dist/
*.tsbuildinfo
```

### 3. Add Root-Level Tooling (package.json)
**Add to root package.json:**
- **DevDependencies:** `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `prettier`, `lint-staged`, `husky`, `@commitlint/cli`, `@commitlint/config-conventional`, `typescript`, `vitest`
- **Scripts:**
  - `lint`: `eslint . --ext .ts,.tsx,.js,.jsx --max-warnings 0`
  - `format`: `prettier --write .`
  - `format:check`: `prettier --check .`
  - `type-check`: `tsc --noEmit`
  - `build`: `npm run build:plugin && npm run build:example`
  - `test`: `vitest run`
  - `validate`: `npm run format:check && npm run lint && npm run type-check && npm run build && npm run test`
  - `prepare`: `husky`
- **lint-staged config** for staged files

### 4. Add ESLint Config (eslint.config.js)
**File:** `eslint.config.js` (flat config, ESLint 9+)
- TypeScript parser
- React plugin (for example site)
- Prettier integration
- Extends: `eslint:recommended`, `plugin:@typescript-eslint/recommended`, `prettier`

### 5. Add Prettier Config (prettier.config.js)
**File:** `prettier.config.js`
- Semi: true, singleQuote: true, tabWidth: 2, trailingComma: es5
- PrintWidth: 100

### 6. Add commitlint Config (commitlint.config.js)
```js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'revert', 'build', 'ci']],
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [2, 'always', 'sentence-case'],
    'subject-empty': [2, 'never'],
    'type-empty': [2, 'never']
  }
}
```

### 7. Setup Husky Hooks
**Run:** `npx husky init` (creates `.husky/pre-commit`)
**Edit `.husky/pre-commit`:**
```sh
npx lint-staged
```
**Create `.husky/commit-msg`:**
```sh
npx commitlint --edit $1
```

### 8. Update Release Workflow (`.github/workflows/release.yml`)
- Use Node 22 LTS (`node-version: '22'` or `'lts/jod'`)
- Add `registry-url: 'https://registry.npmjs.org'` in setup-node
- Run full validation before release: `npm run validate`
- Use `NPM_TOKEN` for npm auth
- Keep semantic-release OR migrate to release-please (see Task 10)

### 9. Add CI Validation Workflow (`.github/workflows/ci.yml`)
**Triggers:** `pull_request` (to main), `push` (to main)
**Jobs:**
- `validate`: Node 22, run `npm ci` → `npm run validate`
- `test-matrix` (optional): Node 20, 22, 24 matrix for compatibility testing

### 10. Add PR Title Validation Workflow (`.github/workflows/pr-title.yml`)
**Use:** `amannn/action-semantic-pull-request@v5`
**Config:** Match commitlint types (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`, `build`, `ci`)
**Require:** PR title follows `<type>(<scope>)<!>: <description>`

### 11. Migrate to release-please for PR-Title-Based Versioning
**Replace semantic-release with:** `googleapis/release-please-action@v4`
**Workflow:** `.github/workflows/release-please.yml`
- Runs on push to main
- Creates release PR based on merged PR titles
- Version mapping: `fix:`=patch, `feat:`=minor, `!`=major
- On release PR merge: publish to npm using `NPM_TOKEN`

**Configuration (in workflow or `.release-please-manifest.json`):**
```json
{
  "packages": {
    "packages/vite-plugin-flatwave-react": {
      "release-type": "node",
      "versioning-strategy": "default"
    }
  }
}
```

### 12. Update Package Engines (Optional)
**File:** `packages/vite-plugin-flatwave-react/package.json`
```json
"engines": { "node": ">=22.0.0" }
```
*Or keep `>=18.0.0` for broader compatibility - decision needed.*

---

## Docker Development Environment Validation

### Prerequisites
- Docker installed and running
- `.env` file with any required secrets (NPM_TOKEN for local testing if needed)

### Build Development Image
```bash
docker build -f docker/dev.Dockerfile -t flatwave-dev .
```

### Run Validation Inside Docker
```bash
# Enter interactive shell
docker run -it --rm -v $(pwd):/app flatwave-dev sh

# Inside container:
npm ci                    # Install dependencies (includes husky prepare)
npm run validate          # Run full validation (format, lint, type-check, build, test)
```

### Test Husky Locally in Docker
```bash
# Inside container:
git add .
git commit -m "feat(setup): add husky and ci validation"  # Should run lint-staged
# If commit message invalid, commitlint will reject it
```

### Test Breaking Change Commit + PR Flow
```bash
# Inside container:
git checkout -b test-breaking-change
# Make a breaking change to source
git add .
git commit -m "feat(api)!: change validator signature

BREAKING CHANGE: validate() now requires locale parameter"
# Push and create PR with same title
# PR title: "feat(api)!: change validator signature"
# This should trigger:
# 1. PR title validation workflow (passes - follows conventional commits)
# 2. CI validation workflow (runs npm run validate)
# 3. On merge to main: release-please creates release PR with major version bump
```

### Verify Docker Build Works
```bash
docker build -f docker/build.Dockerfile -t flatwave-build .
docker run --rm flatwave-build  # Should complete npm run build successfully
```

---

## Validation Checklist

### Local Development (Husky) - Test in Docker
- [ ] `docker run -it flatwave-dev sh -c "npm ci && git commit -m 'test'"` → runs lint-staged
- [ ] `git commit` with invalid message → rejected by commitlint
- [ ] `npm run validate` → runs all checks (format, lint, type-check, build, test)

### CI Pipeline (GitHub Actions)
- [ ] PR opened → runs `pr-title.yml` (validates PR title format)
- [ ] PR opened → runs `ci.yml` (validates: format, lint, type-check, build, test)
- [ ] PR merged to main → triggers `release-please.yml`
- [ ] Release PR merged → publishes to npm with correct version bump

### Version Bumping (PR Title Based)
- [ ] PR title `fix(scope): description` → patch bump
- [ ] PR title `feat(scope): description` → minor bump
- [ ] PR title `feat(scope)!: description` or `BREAKING CHANGE:` → major bump

### Node.js 22 Compatibility
- [ ] Docker dev/build images use `node:22-alpine` ✓
- [ ] CI runs on Node 22
- [ ] Package works when installed in Node 22 project
- [ ] No Node 24+ only APIs used
- [ ] `npm run validate` passes inside Docker container

---

## Dependencies Summary (Root package.json)
```json
{
  "devDependencies": {
    "husky": "^9.1.0",
    "lint-staged": "^15.2.0",
    "@commitlint/cli": "^19.3.0",
    "@commitlint/config-conventional": "^19.3.0",
    "eslint": "^9.9.0",
    "@typescript-eslint/parser": "^8.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "eslint-plugin-prettier": "^5.2.0",
    "prettier": "^3.3.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  },
  "scripts": {
    "prepare": "husky",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx --max-warnings 0",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "build": "npm run build:plugin && npm run build:example",
    "test": "vitest run",
    "validate": "npm run format:check && npm run lint && npm run type-check && npm run build && npm run test",
    "release": "semantic-release"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

---

## Decision Points (Need Implementation Decision)
1. **Keep `engines: ">=18.0.0"` or tighten to `>=22.0.0`**?
2. **Migrate to release-please (recommended) or keep semantic-release with custom analyzer**? (release-please better for PR-title versioning)
3. **Test matrix in CI** (Node 20, 22, 24) or just Node 22?