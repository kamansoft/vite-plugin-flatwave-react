# Changelog

## 2.0.1 (2026-06-20)

### Documentation

- **documentation:** update documentation badges ([#14](https://github.com/kamansoft/vite-plugin-flatwave-react/pull/14))
- **docs:** add architecture, development, contributing documentation and refactor readme ([#13](https://github.com/kamansoft/vite-plugin-flatwave-react/pull/13))

## 2.0.0 (2026-06-20)

### ⚠ BREAKING CHANGES

- **rendering!:** rewrite SSG pipeline with fully-rendered HTML output ([#12](https://github.com/kamansoft/vite-plugin-flatwave-react/pull/12))

### Features

- **rendering:** new SSG pipeline with RenderStrategy interface, DefaultRenderStrategy, RenderPipeline, and hook phases (beforeRender, transformMarkdown, transformHtml, afterRender, onError)
- **rendering:** template system with built-in index.html.ejs and filesystem override convention
- **rendering:** markdown compiler extracted to reusable compileMarkdownToHtml function
- **ci-cd:** document enforce_admins lock and stale-tag cleanup procedure

## 1.1.0 (2026-06-19)

### Features

- **release:** scope package to @kamansoft org and fix CI/CD pipeline
- **ci:** switch to npm OIDC trusted publishing and enforce conventional commit pipeline

### Bug Fixes

- **publish:** force npm token auth for semantic-release
- **release:** enable npm trusted publishing in release workflow
- **release-workflow:** fix failure caused by registry resolution during semantic-release prepare
- **npm-publish:** resolve publishing pipeline conflicts and CI issues

## 1.0.0 (2026-06-17)

### ⚠ BREAKING CHANGES

- **automation:** basic scaffolding for linting formatting and pipelines

### Features

- **automation:** basic scaffolding for linting formatting and pipelines ([81f8716](https://github.com/kamansoft/vite-plugin-flatwave-react/commit/81f87165130c39a004db274381ece3b65ff4ea49))
- **plugin:** ship Flatwave React content plugin and npm release workflow ([f37a8b5](https://github.com/kamansoft/vite-plugin-flatwave-react/commit/f37a8b58f912809852da502de80d391d96256172))

### Bug Fixes

- **publish:** ci for publishing version ([d38dc02](https://github.com/kamansoft/vite-plugin-flatwave-react/commit/d38dc02880fe1addb3a433dc289ba8f3ebc2ebaa))
