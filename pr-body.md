## Summary

This PR sets up the complete CI/CD pipeline for automated npm publishing with conventional commits enforcement.

### Changes

- **Root `.gitignore`** - ignores node_modules, dist, logs
- **Package `.gitignore`** - ignores node_modules, dist, tsbuildinfo
- **Root `package.json`** - added devDependencies (husky, lint-staged, commitlint, eslint, prettier, typescript-eslint) and validation scripts
- **ESLint 9 flat config** (`eslint.config.mjs`) - TypeScript + React + Prettier integration with monorepo ignores
- **Prettier config** (`.prettierrc`) - consistent formatting rules
- **commitlint config** (`commitlint.config.js`) - enforces Conventional Commits format
- **Husky hooks** - pre-commit (lint-staged) + commit-msg (commitlint)
- **GitHub Workflows**:
  - `release-please.yml` - PR-title-based versioning (fix→patch, feat→minor, !→major) + npm publish with NPM_TOKEN
  - `ci.yml` - validation pipeline on PR/push + Node 20/22/24 matrix
  - `pr-title.yml` - validates PR title follows Conventional Commits
- **Release Please manifest** - configuration for monorepo package
- **Package engines** - updated to `>=22.0.0` for Node 22 LTS compatibility

### Validation

All checks pass locally:

- `npm run format:check` ✓
- `npm run lint` ✓
- `npm run type-check` ✓
- `npm run build` ✓
- `npm run test` ✓
- Husky pre-commit + commit-msg hooks ✓
