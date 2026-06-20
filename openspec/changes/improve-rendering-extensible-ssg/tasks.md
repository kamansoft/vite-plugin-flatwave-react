## 1. Project Setup & Dependencies

- [x] 1.1 Add `remark`, `remark-parse`, `remark-rehype`, `rehype-stringify`, `rehype-raw`, `unified` to `package.json` dependencies
- [x] 1.2 Add `@types/remark` and `@types/rehype` to devDependencies if needed
- [x] 1.3 Verify TypeScript config includes new modules

## 2. Markdown Compiler Module (`src/content/markdownCompiler.ts`)

- [x] 2.1 Create `MarkdownCompilerOptions` interface (remarkPlugins, rehypePlugins, allowRawHtml)
- [x] 2.2 Implement `compileMarkdownToHtml(markdown: string, options?: MarkdownCompilerOptions): Promise<string>`
- [x] 2.3 Configure unified pipeline: remark-parse → remark-rehype → rehype-stringify
- [x] 2.4 Support custom remark/rehype plugins via options
- [x] 2.5 Handle raw HTML passthrough via `rehype-raw` when `allowRawHtml: true`
- [x] 2.6 Export from `src/content/index.ts` (add to public API)
- [x] 2.7 Write unit tests for compiler (basic, custom plugins, raw HTML)

## 3. SSG Core Types (`src/ssg/types.ts`)

- [x] 3.1 Define `RenderContext` interface with: route, contentEntry, components, assets, hooks, options, locale, allRoutes
- [x] 3.2 Define `RenderStrategy` interface: `render(context: RenderContext): Promise<string>`
- [x] 3.3 Define `RenderHooks` interface with phases: `beforeRender`, `transformMarkdown`, `transformHtml`, `afterRender`, `onError`
- [x] 3.4 Define `SsgOptions` interface (enabled, strategy, hooks, template, compileMarkdown)
- [x] 3.5 Define `TemplateOverrides` type for template customization
- [x] 3.6 Export all types from `src/ssg/index.ts`

## 4. Default Render Strategy (`src/ssg/DefaultRenderStrategy.ts`)

- [x] 4.1 Create `DefaultRenderStrategy` class implementing `RenderStrategy`
- [x] 4.2 Implement `render(context)` using `ReactDOMServer.renderToString`
- [x] 4.3 Resolve component for route: dynamic import from built assets or Vite module graph
- [x] 4.4 Pass `contentEntry` (with compiled HTML) as props to component
- [x] 4.5 Handle component render errors gracefully (return error boundary HTML)
- [x] 4.6 Use `compileMarkdownToHtml` from content module for markdown body
- [x] 4.7 Inject compiled HTML into component via prop (e.g., `markdownHtml`)

## 5. Render Pipeline (`src/ssg/RenderPipeline.ts`)

- [x] 5.1 Create `RenderPipeline` class managing hook arrays per phase
- [x] 5.2 Implement `addHook(phase,hook(phase, hook)` for registration
- [x] 5.3 Implement `executePhase(phase, context)` running hooks in sequence
- [x] 5.4 Phase: `beforeRender(context) -> modifiedContext`
- [x] 5.5 Phase: `transformMarkdown(markdown, context) -> transformedMarkdown`
- [x] 5.6 Phase: `transformHtml(html, context) -> transformedHtml`
- [x] 5.7 Phase: `afterRender(html, context) -> void` (side effects, no return)
- [x] 5.8 Phase: `onError(error, context) -> fallbackHtml` (recovery)
- [x] 5.9 Error handling: failed hooks logged, pipeline continues (except onError)
- [x] 5.10 Export from `src/ssg/index.ts`

## 6. Template System (`src/ssg/template.ts`)

- [x] 6.1 Create `templates/` directory in package with: `index.html.ejs`, `entry-client.tsx.ejs`, `entry-server.tsx.ejs`
- [x] 6.2 Implement `resolveTemplate(name, overrides?): string` — reads built-in or custom path
- [x] 6.3 Simple EJS-style interpolation: `<%= variable %>`
- [x] 6.4 Built-in template variables: `appHtml`, `title`, `meta`, `assets`, `locale`, `canonical`, `headTags`
- [x] 6.5 Support filesystem override: `flatwave-templates/{name}` at project root
- [x] 6.6 Export `renderTemplate(template, variables)` utility

## 7. Main SSG Orchestrator (`src/ssg/index.ts`)

- [x] 7.1 Create `runSsg(index, options, viteBundle)` function
- [x] 7.2 Initialize `DefaultRenderStrategy` or custom strategy
- [x] 7.3 Build `RenderPipeline` with user hooks + built-in hooks
- [x] 7.4 For each route (parallel with concurrency limit):
  - [x] 7.4.1 Build `RenderContext` with route, content, assets, components
  - [x] 7.4.2 Execute `beforeRender` hooks
  - [x] 7.4.3 Compile markdown via pipeline `transformMarkdown`
  - [x] 7.4.4 Execute strategy `render(context)`
  - [x] 7.4.5 Execute `transformHtml` hooks on result
  - [x] 7.4.6 Apply template via `renderTemplate`
  - [x] 7.4.7 Execute `afterRender` hooks
  - [x] 7.4.8 Emit file via Vite `this.emitFile`
  - [x] 7.4.9 Catch errors → execute `onError` → use fallback
- [x] 7.5 Emit sitemap.xml, robots.txt, route-manifest.json (unchanged)
- [x] 7.6 Export `runSsg` and all public types from `src/ssg/index.ts`

## 8. Plugin Integration (`src/index.ts`)

- [x] 8.1 Update `FlatwaveContentOptions` in `types.ts` to include `ssg?: SsgOptions`
- [x] 8.2 Refactor `flatwave-react:ssg` plugin to call `runSsg` from `src/ssg`
- [x] 8.3 Pass Vite bundle assets (scripts/styles) to SSG context
- [x] 8.4 Remove inline `renderRouteHtml`, `renderSitemap`, `renderRobotsTxt` (move to SSG module or keep as utilities)
- [x] 8.5 Ensure virtual module still works for client-side hydration
- [x] 8.6 Update plugin option normalization for `ssg` defaults

## 9. Public API Exports

- [x] 9.1 Add `./ssg` export to `package.json` exports map
- [x] 9.2 Export: `RenderStrategy`, `DefaultRenderStrategy`, `RenderContext`, `RenderHooks`, `RenderPipeline`, `SsgOptions`, `compileMarkdownToHtml`, `runSsg`, `renderTemplate`
- [x] 9.3 Update `src/virtual.d.ts` if needed for new types
- [x] 9.4 Run `npm run build` to verify types and exports

## 10. Built-in Templates

- [x] 10.1 Create `src/ssg/templates/index.html.ejs` with full HTML shell, SEO tags, asset injection
- [x] 10.2 Create `src/ssg/templates/entry-client.tsx.ejs` for hydration entry
- [x] 10.3 Create `src/ssg/templates/entry-server.tsx.ejs` for SSR entry (future-proofing)
- [x] 10.4 Ensure templates copy to `dist/ssg/templates/` at build (add to build script)

## 11. Dead Code Removal (Cleanup)

- [x] 11.1 Remove empty `src/ssg/` directory (before creating new one)
- [x] 11.2 Remove inline `renderRouteHtml`, `renderSitemap`, `renderRobotsTxt` functions from `src/index.ts`
- [x] 11.3 Remove any unused exports in `src/types.ts` not referenced by new SSG module
- [x] 11.4 Search for and remove any other dead code (unused imports, dead exports, empty files)
- [x] 11.5 Run `npm run build` and `npm run test` after each removal to verify no regressions

## 12. Example App Integration & Verification

- [x] 12.1 Update example `vite.config.ts` to test custom strategy + hooks
- [x] 12.2 Add example hook: `transformMarkdown` injecting custom component
- [x] 12.3 Add example hook: `transformHtml` injecting analytics
- [x] 12.4 Run `npm run build:example` and verify output HTML contains rendered content
- [x] 12.5 Run `npm run test:e2e` — verify all 5 test cases pass
- [x] 12.6 Check emitted HTML: `<div id="root">` has content, markdown compiled, SEO tags present

## 13. Documentation & Polish

- [x] 13.1 Update README with new SSG options and extensibility guide
- [x] 13.2 Document `RenderStrategy` interface with implementation example
- [x] 13.3 Document hook phases with use cases
- [x] 13.4 Document template override methods
- [x] 13.5 Run `npm run validate` (lint, type-check, build, test) — all must pass

## 14. Docker Quality Gates Validation

- [x] 14.1 Verify `npm run format:check` passes in Docker environment
- [x] 14.2 Verify `npm run lint` passes in Docker environment
- [x] 14.3 Verify `npm run type-check` passes in Docker environment
- [x] 14.4 Verify `npm run build` passes in Docker environment
- [x] 14.5 Verify `npm run test` passes in Docker environment
- [x] 14.6 Verify `npm run validate` (full pipeline) passes in Docker environment
- [x] 14.7 Document Docker CI requirements in README/CONTRIBUTING
