## Context

The plugin already ships two coherent layers:

1. **Content layer** — `flatwave-react:content` + `flatwave-react:markdown`: indexes Markdown files,
   produces the `virtual:flatwave/content` module, compiles Markdown to HTML during build.

2. **Presentation layer** — composable React components: `FlatwaveLanguageRouter`, `FlatwaveAppRoutes`,
   `FlatwaveMDComponent`, `FlatwaveMDPageComponent`, `FlatwaveLanguageSelector`,
   `FlatwaveLanguageDetector`, `FlatwaveLanguageContext`.

3. **SSG layer** — `flatwave-react:ssg`: after the bundle is built, loops over all public routes and
   emits static HTML files using `DefaultRenderStrategy`.

The current disconnect: the SSG layer bypasses the presentation layer. `DefaultRenderStrategy` tries to
`import('../react/{componentName}.js')` or `import('virtual:flatwave/components/{componentName}')` for
each route. This means the consumer must:

- Name their page component in every frontmatter file (`component: 'SimplePage'`)
- Put that component in a `componentsDir` the plugin can reach at build time

When no component is found, the strategy silently falls back to returning raw compiled markdown string —
not even wrapped in a `<main>` element.

`FlatwaveMDPageComponent` already exists and is precisely the component that should render each SSG page.
It accepts `frontmatter`, `markdownHtml`, and `locale` — exactly what `DefaultRenderStrategy` has
available in `RenderContext`. The only reason it has not been used is an unresolved ESM/CJS
interoperability issue with `react-helmet-async` and `react-markdown` in the Node SSG environment.

## Goals / Non-Goals

**Goals:**

- `DefaultRenderStrategy` uses `FlatwaveMDPageComponent` as its primary (and default) renderer.
- `FlatwaveMDPageComponent` is fixed to work correctly in a Node `renderToString` context by resolving
  the `react-helmet-async` and `react-markdown` CJS/ESM interop issues.
- `componentsDir` becomes an _optional override_ mechanism, not a required configuration.
- The `component` frontmatter field is no longer in `requiredFields` by default; it is read as an override
  when present.
- The example site demonstrates the composable pattern: `FlatwaveLanguageRouter` + `FlatwaveMDPageComponent`
  in `App.tsx`; `vite build` automatically generates all locale-prefixed HTML routes from that.
- All existing e2e tests continue to pass.

**Non-Goals:**

- Removing the SSG pipeline or making it opt-in.
- Removing `componentsDir` support (keep for backward compatibility).
- Changing the virtual module API.
- Changing any composable component prop APIs.

## Decisions

### Decision 1: Fix `react-helmet-async` interop with a namespace import

`import * as ReactHelmet from 'react-helmet-async'` plus `const { Helmet, HelmetProvider } = ReactHelmet`
works across both CJS and ESM builds. The same pattern is already used for `react-router-dom` in the
component files. Apply the same fix consistently.

**Alternatives considered:**

- Dynamic `import()` of `react-helmet-async` at call time — avoids top-level interop but breaks
  synchronous render; `renderToString` requires synchronous React trees.
- Skip `react-helmet-async` in SSG context — valid shortcut, but head tags are then missing from the
  SSG HTML output, which defeats the SEO purpose. `HelmetProvider` handles SSR correctly when wrapped.

### Decision 2: `FlatwaveMDPageComponent` always wraps in `HelmetProvider` during SSG

`DefaultRenderStrategy` wraps the `FlatwaveMDPageComponent` tree in `<HelmetProvider>` before calling
`renderToString`. This is the correct SSR pattern for `react-helmet-async` — the provider serialises head
tags into a side-channel object that can be extracted. In non-SSG (client-side) usage, the consumer wraps
their app in `<HelmetProvider>` via their own entry point.

### Decision 3: `buildComponentsMap` is called only when `componentsDir` is configured

`runSsg.ts` currently calls `buildComponentsMap(routes)` unconditionally. After this change, it SHALL only
call this function when `options.componentsDir` is non-null. This avoids a warning-filled build log for
the common case where no `componentsDir` is set.

### Decision 4: `component` removed from default `requiredFields`

`requiredFields` defaults to `['title', 'slug', 'id', 'component', 'public']`. The `component` field is
no longer required for SSG to work because `FlatwaveMDPageComponent` handles any content entry without
it. Remove `component` from the default list. Consumers who still use the component-by-name override can
add it back explicitly.

### Decision 5: Example site rewritten to use composable pattern

`examples/basic-react-site/src/App.tsx` is rewritten to use `FlatwaveLanguageRouter` with
`FlatwaveMDPageComponent` as the `renderPage`. `componentsDir` is removed from `vite.config.ts`.
Frontmatter files no longer need `component: 'SimplePage'`. The e2e tests must still pass after this
change — they check title, locale, sitemap, and robots, all of which remain correct.

## Risks / Trade-offs

| Risk                                                                                    | Mitigation                                                                              |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `react-helmet-async` fix may not cover all edge cases                                   | Test with `renderToString` in unit tests for `DefaultRenderStrategy`                    |
| Removing `component` from `requiredFields` breaks validation for projects relying on it | Documented as a breaking change; consumers can re-add it to `requiredFields` explicitly |
| Example site e2e assertions depend on rendered page title                               | `FlatwaveMDPageComponent` renders `<title>` from frontmatter — assertions remain valid  |
| Consumer components (SimplePage, ProgramPage) still work via override                   | Backward compat preserved via `componentsDir` when configured                           |
