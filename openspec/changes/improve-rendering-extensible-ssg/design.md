## Context

The plugin currently has three Vite plugins in `src/index.ts`:

1. `flatwave-react:content` — builds content index, serves virtual module
2. `flatwave-react:markdown` — transforms individual `.md` imports to JS modules
3. `flatwave-react:ssg` — emits static HTML shells, sitemap, robots.txt, route manifest

The SSG plugin generates empty `<div id="root"></div>` shells. The markdown body is raw markdown string, rendered client-side via `react-markdown` in consumer apps. No extensibility exists. The `src/ssg/` directory exists but is empty (dead code). Inline functions `renderRouteHtml`, `renderSitemap`, `renderRobotsTxt` in `index.ts` will be replaced.

## Goals / Non-Goals

**Goals:**

- Fully-rendered HTML at build time via `ReactDOMServer.renderToString`
- Markdown compiled to HTML at build time (not client-side)
- Strategy pattern for render pipeline: `RenderStrategy` interface + `DefaultRenderStrategy`
- Hook system: `beforeRender`, `transformMarkdown`, `transformHtml`, `afterRender`, `onError`
- Template system for `index.html` and entry points
- All new code in `src/ssg/` following SOLID (SRP, OCP, LSP, ISP, DIP) and DRY
- Zero-config optimal defaults; opt-in extensibility
- No backward compatibility
- **Remove all unused/dead code** (empty `src/ssg/`, inline SSG functions, unused exports)
- **All quality gates pass in Docker**: `npm run format:check && npm run lint && npm run type-check && npm run build && npm run test`

**Non-Goals:**

- Runtime SSR server (this is SSG-only)
- React Server Components (RSC) — strategy pattern allows future addition
- Streaming SSR (`renderToPipeableStream`) — `renderToString` is sufficient for SSG
- Client-side hydration logic (consumer responsibility)
- Image optimization, font inlining (out of scope)

## Decisions

### 1. Render Strategy Pattern (SRP + OCP)

**Decision**: Define `RenderStrategy` interface with single `render(context: RenderContext): Promise<string>` method. `DefaultRenderStrategy` implements standard React+Markdown rendering. Consumers provide custom strategies via `options.ssg.strategy`.

**Rationale**:

- SRP: Each strategy encapsulates one rendering approach
- OCP: New strategies added without modifying core pipeline
- DIP: Pipeline depends on abstraction (`RenderStrategy`), not concrete implementation
- Alternatives considered:
  - Function-based callbacks → less structured, no type safety for context
  - Class inheritance → tighter coupling, harder to compose
  - Plugin hooks only → no coherent "strategy" concept for whole-pipeline replacement

### 2. Render Context Object (DIP + ISP)

**Decision**: `RenderContext` contains all data needed for rendering: `route`, `contentEntry`, `components`, `hooks`, `assets`, `options`. Passed to strategy and all hooks.

**Rationale**:

- ISP: Context exposes only what's needed; hooks receive focused subsets via destructuring
- DIP: Strategies/hooks depend on context interface, not global state
- Single source of truth for render-time data

### 3. Hook Pipeline (OCP + SRP)

**Decision**: `RenderPipeline` class manages ordered hook arrays per lifecycle phase. Hooks are async functions receiving typed context slices. Phases: `beforeRender`, `transformMarkdown`, `transformHtml`, `afterRender`, `onError`.

**Rationale**:

- OCP: New hooks added without modifying pipeline execution logic
- SRP: Each phase has single responsibility
- Composition over inheritance: hooks are functions, not classes
- Error boundary: `onError` phase receives error + partial context for recovery/logging

### 4. Markdown → HTML Compiler (SRP + DRY)

**Decision**: New `src/content/markdownCompiler.ts` exports `compileMarkdownToHtml(markdown, options?)` using unified/remark/rehype pipeline. Reusable by `DefaultRenderStrategy` and consumers.

**Rationale**:

- SRP: Single responsibility for markdown→HTML
- DRY: Eliminates duplication between SSG render and potential future uses (RSS, email, etc.)
- Extensible: Accepts custom remark/rehype plugins via options

### 5. Template System (SRP + OCP)

**Decision**: `src/ssg/template.ts` provides `resolveTemplate(templateName, overrides?)` that reads from `templates/` directory (bundled with plugin) or consumer-provided paths. Templates are EJS-style with `<%= %>` interpolation.

**Rationale**:

- SRP: Template resolution isolated
- OCP: Consumers override via option or file system convention
- No new template engine dependency — simple string interpolation

### 6. Plugin Options Structure

```ts
interface SsgOptions {
  enabled: boolean; // default: true
  strategy?: RenderStrategy; // default: DefaultRenderStrategy
  hooks?: Partial<RenderHooks>; // default: {}
  template?: string | TemplateOverrides; // default: built-in
  compileMarkdown?: MarkdownCompilerOptions; // default: {}
}
```

**Rationale**: Flat, explicit options. No nested complexity. All optional with sensible defaults.

### 7. Component Resolution at Build Time

**Decision**: `DefaultRenderStrategy` resolves component imports via Vite's module graph at build time using `ssrLoadModule` or dynamic import of built assets. Components receive `contentEntry` as props.

**Rationale**:

- Build-time resolution matches Vite SSG model
- Avoids runtime server requirement
- Components stay pure React (no server-only code paths)

### 8. Dead Code Removal (DRY + Clean Architecture)

**Decision**: Remove empty `src/ssg/` directory, inline `renderRouteHtml`, `renderSitemap`, `renderRobotsTxt` functions from `index.ts`, any unused exports in `types.ts`, and any dead code identified during refactor.

**Rationale**:

- DRY: Don't keep code that will be replaced
- Clean architecture: No vestigial structures
- Reduces cognitive load and bundle size

### 9. Docker Quality Gates (CI/CD Ready)

**Decision**: All code must pass `npm run validate` (which runs format:check, lint, type-check, build, test) in the Docker CI environment. No exceptions. Pre-commit hooks enforce locally.

**Rationale**:

- Prevents merge of broken code
- Docker ensures environment parity
- `validate` script already exists in root package.json

## Risks / Trade-offs

| Risk                                                         | Mitigation                                                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Build-time component execution fails (e.g., `window` access) | Document "SSG-safe" component patterns; `onError` hook captures failures per-route; continue other routes |
| Large sites: renderToString for hundreds of routes slow      | Parallelize route rendering via `Promise.all` with configurable concurrency; cache compiled markdown HTML |
| Custom strategies break hydration (mismatched HTML)          | Document contract: strategy must produce HTML compatible with `hydrateRoot`; provide test utility         |
| Template system too simple for complex needs                 | Escape hatch: `strategy` can bypass templates entirely; templates are convenience only                    |
| New dependencies increase bundle size                        | `remark`/`rehype` only in dev/build (not client bundle); tree-shakable imports                            |
| Dead code removal breaks something                           | Run full test suite after each removal; git history preserves removed code                                |

## Migration Plan

1. Create `src/ssg/` module with interfaces, `DefaultRenderStrategy`, `RenderPipeline`, `RenderContext`
2. Implement `markdownCompiler.ts` in `src/content/`
3. Refactor `index.ts` SSG plugin to use new pipeline
4. Add `templates/` directory with default `index.html.ejs`, `entry-client.tsx.ejs`, `entry-server.tsx.ejs`
5. Update `types.ts` with new option types and exports
6. **Remove dead code**: empty `src/ssg/`, inline SSG functions, unused exports
7. Update example app to demonstrate custom strategy + hooks
8. Run E2E tests; verify fully-rendered HTML output
9. **Run `npm run validate` in Docker** — all gates must pass

No rollback needed — new change, no users.

## Open Questions

1. **Concurrency limit for parallel route rendering**: Default to `navigator.hardwareConcurrency` or fixed (e.g., 4)?
2. **Should `compileMarkdownToHtml` be sync or async?**: Async for remark plugins that do I/O; sync for pure transforms. Lean async.
3. **Template syntax**: EJS-style `<%= %>` vs. `{{ }}` vs. JS template literals? EJS is familiar, no deps.
4. **Export `RenderStrategy` from `./ssg` or `./types`?**: `./ssg` — it's implementation-adjacent, not a pure type.
5. **Hydration mismatch detection**: Add dev-only checksum comparison between SSR and client render?
