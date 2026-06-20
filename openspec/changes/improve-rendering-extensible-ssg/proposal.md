## Why

The current plugin generates static HTML shells with empty `<div id="root"></div>` placeholders, leaving all React rendering to the client. This means search engines and social media crawlers see empty content on first load, defeating SEO goals. The plugin also lacks extensibility hooks, making it impossible for consumers to customize the rendering pipeline (e.g., custom markdown processors, head injection, route transformations) without forking. We need a hybrid rendering approach: fully-rendered HTML on first request (markdown → React components → HTML via `renderToString`), followed by React hydration for interactivity, all while exposing a Strategy-pattern-based extension system for the render loop. **Optimization and extensibility are paramount** — we follow SOLID and DRY principles rigorously. **Backward compatibility is not a concern** since the plugin has no production users yet. **All unused code must be removed** and the final deliverable must pass formatting, linting, type-checking, and build within the Docker environment.

## What Changes

- Add `renderToString`-based SSG that compiles markdown to HTML at build time and injects it into the result into root element, producing fully-hydratable HTML
- Replace inline SSG logic in `index.ts` with dedicated `src/ssg/` module containing `RenderStrategy`, `RenderContext`, pipeline hooks
- Introduce `RenderStrategy` interface (Strategy pattern) with `DefaultRenderStrategy` for standard React+Markdown rendering and extension points for custom strategies
- Add `RenderPipeline` with lifecycle hooks: `beforeRender`, `transformMarkdown`, `transformHtml`, `afterRender`, `onError`
- Provide template `index.html` and entry points that consumers can extend/override
- Make Vite trigger rendering via plugin options (`ssg: { enabled: true, strategy?: RenderStrategy, hooks?: RenderHooks }`)
- Export markdown-to-HTML compiler (unified/remark/rehype) as reusable utility
- **No backward compatibility layer** — clean break from empty-shell to fully-rendered HTML
- **Remove all dead/unused code** from current codebase (inline SSG functions, unused exports, empty directories)
- **Enforce code quality gates**: format (prettier), lint (eslint), type-check (tsc), build (tsc + copy script), test (vitest) — all must pass in Docker CI environment

## Capabilities

### New Capabilities

- `hybrid-ssg-rendering`: Build-time React rendering with `renderToString` producing fully-hydratable HTML per route, including compiled markdown content
- `render-strategy-pattern`: Strategy pattern interface (`RenderStrategy`) allowing third-party developers to plug in custom rendering workflows (e.g., RSC, edge rendering, custom HTML transforms)
- `render-pipeline-hooks`: Extensible hook system (`beforeRender`, `transformMarkdown`, `transformHtml`, `afterRender`, `onError`) for middleware-style customization of the render loop
- `markdown-to-html-compiler`: Reusable utility to compile markdown frontmatter+body to HTML string, supporting custom remark/rehype plugins
- `ssg-template-system`: Template-based `index.html` and entry file generation that consumers can extend via `template` option or file overrides
- `code-quality-gates`: Docker-validated CI pipeline enforcing format, lint, type-check, build, test

### Modified Capabilities

- `static-site-generation`: Existing SSG capability (emitting `index.html`, `sitemap.xml`, `robots.txt`, `route-manifest.json`) now emits fully-rendered HTML instead of empty shells. Behavior change at spec level.
- `seo-metadata`: Enhanced to include fully-rendered content in meta tags (og:description from actual content, structured data from rendered components)

## Impact

- **Affected code**: `packages/vite-plugin-flatwave-react/src/index.ts` (SSG plugin), new `src/ssg/` directory, `src/content/` (markdown compiler utility), `src/seo/metadata.ts` (enhanced metadata), removal of dead code in `src/ssg/` (empty dir), inline SSG functions
- **New dependencies**: `react-dom/server` (peer dep), `remark`, `rehype`, `rehype-stringify`, `rehype-raw`, `unified`, `remark-parse`, `remark-rehype` (dev/build only, not client bundle)
- **API changes**: New `FlatwaveContentOptions.ssg` object with `enabled`, `strategy`, `hooks`, `template`, `compileMarkdown` fields. New exports from `./ssg` entry point.
- **Consumer impact**: Zero-config upgrade (HTML shells → full HTML). Opt-in for custom strategies/hooks. Template files can be ejected via `flatwave eject` CLI (future).
- **Breaking changes**: **Intentional and acceptable** — complete replacement of empty-shell SSG with fully-rendered HTML. No compatibility shims.
- **Code quality**: All formatting, linting, type-checking, build, and test commands must pass in Docker environment before merge
