## ADDED Requirements

### Capability: Full HTML Rendering (SSG)

The system SHALL generate fully-rendered HTML at build time for all public routes, including compiled Markdown content and React component output, suitable for static hosting with zero JavaScript required for initial content visibility.

#### Scenario: Home page renders with full content

- **GIVEN** a route `/es/` with content entry containing markdown body and component `HomePage`
- **WHEN** SSG runs at build time
- **THEN** output HTML contains `<div id="root">` with fully rendered `HomePage` component HTML
- **AND** markdown body is compiled to HTML (not raw markdown)
- **AND** all SEO metadata from frontmatter is present in `<head>`
- **AND** no client-side hydration is required for content visibility

#### Scenario: All locales and routes rendered

- **GIVEN** configured locales `['es', 'pt']` and content entries for each
- **WHEN** SSG runs
- **THEN** HTML files emitted at `/es/index.html`, `/pt/index.html`, `/es/about/index.html`, etc.
- **AND** each file contains locale-appropriate rendered content
- **AND** `hreflang` alternates are correct in `<head>`

#### Scenario: Markdown compiled to HTML at build time

- **GIVEN** content entry with frontmatter `body: "# Hello\n\nWorld"` and component using `MarkdownRenderer`
- **WHEN** SSG renders the route
- **THEN** output HTML contains `<h1>Hello</h1><p>World</p>` (not raw markdown)
- **AND** no `react-markdown` or client-side markdown parser runs for initial paint

---

### Capability: Render Strategy Pattern

The system SHALL provide a `RenderStrategy` interface allowing third parties to completely replace the rendering pipeline while receiving a typed `RenderContext`.

#### Scenario: Custom strategy renders to alternative format

- **GIVEN** a custom `PdfRenderStrategy` implementing `RenderStrategy`
- **WHEN** configured via `options.ssg.strategy = new PdfRenderStrategy()`
- **THEN** SSG uses the custom strategy for all routes
- **AND** `RenderContext` provides route, content, components, assets
- **AND** strategy returns PDF bytes (or any string output)

#### Scenario: Default strategy used when none provided

- **GIVEN** no `strategy` in options
- **WHEN** SSG runs
- **THEN** `DefaultRenderStrategy` is instantiated and used
- **AND** behavior matches built-in React + Markdown rendering

#### Scenario: Strategy receives complete render context

- **GIVEN** any `RenderStrategy` implementation
- **WHEN** `strategy.render(context)` is called
- **THEN** `context` contains: `route`, `contentEntry`, `components`, `assets`, `hooks`, `options`, `locale`, `allRoutes`
- **AND** types are fully typed (TypeScript interfaces exported)

---

### Capability: Hook Pipeline

The system SHALL provide a hook pipeline with five lifecycle phases, each receiving a typed context slice, allowing third parties to observe, transform, or augment the rendering process without replacing the entire strategy.

#### Scenario: Transform markdown before compilation

- **GIVEN** hook `transformMarkdown: async (markdown, context) => markdown.replace(/CUSTOM_TAG/g, '<custom-component />')`
- **WHEN** page with markdown containing `CUSTOM_TAG` is rendered
- **THEN** markdown is transformed before remark/rehype compilation
- **AND** resulting HTML contains `<custom-component />`

#### Scenario: Transform final HTML before emit

- **GIVEN** hook `transformHtml: async (html, context) => html.replace('</head>', '<script>console.log("injected")</script></head>')`
- **WHEN** route HTML is generated
- **THEN** emitted HTML contains injected script tag
- **AND** transformation runs after strategy render but before file emit

#### Scenario: Before render hook modifies context

- **GIVEN** hook `beforeRender: async (context) => ({ ...context, assets: injectCriticalCss(context.assets) })`
- **WHEN** render begins
- **THEN** strategy receives modified assets with critical CSS inlined

#### Scenario: After render hook for side effects

- **GIVEN** hook `afterRender: async (html, context) => await uploadToCdn(html, context.route.path)`
- **WHEN** route renders successfully
- **THEN** hook executes with final HTML and route context
- **AND** errors in hook do not fail the build (logged via `onError`)

#### Scenario: Error hook captures render failures

- **GIVEN** hook `onError: async (error, context) => { log(error); return '<div>Error</div>'; }`
- **WHEN** strategy throws during render
- **THEN** `onError` receives error and partial context
- **AND** hook return value used as fallback HTML for that route
- **AND** build continues for remaining routes

---

### Capability: Template System

The system SHALL provide a template system for `index.html` and entry points, with built-in defaults and override capability via option or filesystem convention.

#### Scenario: Default template produces valid HTML shell

- **GIVEN** no custom template configured
- **WHEN** SSG emits route HTML
- **THEN** output uses built-in template with: `<!doctype html>`, `<html lang="...">`, `<head>` with charset, viewport, title, meta, canonical, SEO tags, asset links/scripts, `<body><div id="root">{appHtml}</div></body>`
- **AND** `appHtml` placeholder replaced with strategy output

#### Scenario: Consumer overrides template via option

- **GIVEN** `options.ssg.template = '/custom/template.html'`
- **WHEN** SSG runs
- **THEN** custom template file is read and used
- **AND** template receives same interpolation variables as built-in

#### Scenario: Consumer ejects templates via filesystem

- **GIVEN** project contains `flatwave-templates/index.html` at root
- **WHEN** SSG runs
- **THEN** filesystem template takes precedence over built-in
- **AND** no config change required

---

### Capability: Build-Time Markdown Compiler

The system SHALL expose a reusable `compileMarkdownToHtml(markdown, options?)` function that compiles Markdown to HTML using a remark/rehype pipeline, usable by the default strategy and third parties.

#### Scenario: Compile basic markdown

- **GIVEN** `compileMarkdownToHtml('# Hello\n\nWorld')`
- **THEN** returns `<h1>Hello</h1>\n<p>World</p>\n`

#### Scenario: Custom remark/rehype plugins

- **GIVEN** `compileMarkdownToHtml(md, { remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] })`
- **THEN** output includes math rendering
- **AND** plugins execute in provided order

#### Scenario: Raw HTML passthrough option

- **GIVEN** `compileMarkdownToHtml('<div>raw</div>', { allowRawHtml: true })`
- **THEN** raw HTML preserved in output
- **AND** default (`false`) sanitizes/removes raw HTML

---

### Capability: Code Quality Gates (Docker)

The system SHALL enforce code quality through automated gates that must pass in the Docker CI environment before any merge.

#### Scenario: Format check passes

- **GIVEN** code changes
- **WHEN** `npm run format:check` runs in Docker
- **THEN** exits with code 0 (no formatting violations)

#### Scenario: Lint passes

- **GIVEN** code changes
- **WHEN** `npm run lint` runs in Docker
- **THEN** exits with code 0 (no lint errors, max-warnings 0)

#### Scenario: Type check passes

- **GIVEN** code changes
- **WHEN** `npm run type-check` runs in Docker
- **THEN** exits with code 0 (no TypeScript errors)

#### Scenario: Build passes

- **GIVEN** code changes
- **WHEN** `npm run build` runs in Docker
- **THEN** exits with code 0 (TypeScript compilation + copy script succeeds)

#### Scenario: Tests pass

- **GIVEN** code changes
- **WHEN** `npm run test` runs in Docker
- **THEN** exits with code 0 (all vitest tests pass)

#### Scenario: Validate script passes

- **GIVEN** code changes
- **WHEN** `npm run validate` runs in Docker (runs format:check, lint, type-check, build, test)
- **THEN** exits with code 0 (all sub-commands pass)

---

## MODIFIED Requirements

### Capability: SSG Output (formerly empty-shell generation)

The SSG plugin SHALL emit fully-rendered HTML instead of empty shells.

#### Scenario: Route HTML contains rendered app (MODIFIED)

- **GIVEN** existing route `/es/about`
- **WHEN** SSG emits HTML
- **THEN** `<div id="root">` contains rendered component HTML (was empty)
- **AND** markdown content compiled to HTML (was raw markdown in virtual module only)
- **AND** all SEO metadata from `renderHtmlHead` preserved

#### Scenario: Sitemap and robots.txt unchanged

- **GIVEN** existing sitemap/robots generation
- **WHEN** SSG runs
- **THEN** `sitemap.xml` and `robots.txt` emitted identically
- **AND** `route-manifest.json` includes same routes

---

## REMOVED Requirements

### Capability: Dead Code Cleanup

The following unused/dead code SHALL be removed from the codebase:

- Empty `src/ssg/` directory
- Inline `renderRouteHtml`, `renderSitemap`, `renderRobotsTxt` functions in `src/index.ts`
- Any unused exports in `src/types.ts` not referenced by new SSG module
- Any dead code identified during refactor

---

## RENAMED Requirements

None.
