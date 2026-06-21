## Why

Automatic route generation is a first-class feature of this plugin: Vite produces one
`{locale}/{slug}/index.html` per Markdown content file, a `sitemap.xml`, and a `robots.txt` — all driven
by the content index. **This stays.**

The problem is _how_ routes are currently rendered. `DefaultRenderStrategy` imports specific React page
components by the name stored in each frontmatter `component` field (e.g. `component: 'SimplePage'`),
resolving them from a consumer-supplied `componentsDir`. This couples the SSG build step to an
implementation detail inside the consumer's project that has nothing to do with the composable routing
toolkit the plugin ships.

The same plugin already exports `FlatwaveMDPageComponent` — a fully capable, SEO-aware, locale-aware React
component designed exactly for rendering a Markdown content entry as a complete HTML page. There is no
reason for the SSG to bypass it in favour of loading arbitrary consumer components by name.

The fix: `DefaultRenderStrategy` uses `FlatwaveMDPageComponent` as its **only** renderer.
`componentsDir` and the frontmatter `component` field are **removed entirely**.

On the application side, `FlatwaveLanguageRouter` defines the client-side routing. Because the SSG and the
client-side SPA now use the same `FlatwaveMDPageComponent` to render content, hydration is coherent: the
HTML the SSG produces matches the DOM the SPA would render for the same route.

## What Changes

- **MODIFIED**: `DefaultRenderStrategy` uses `FlatwaveMDPageComponent` as its **only** renderer.
  It no longer requires a `componentsDir` or a `component` frontmatter field to produce valid HTML output.
- **REMOVED**: `componentsDir` config option — no longer accepted in plugin options.
- **REMOVED**: `component` frontmatter field — no longer read or validated.
- **ADDED**: Strategy pattern for build process extensibility - `onContentProcessed` hook in SSG options
  allows users to define custom logic to create additional files (e.g., JSON) from the markdown content loop.
- **KEPT**: `FlatwaveLanguageRouter`, `FlatwaveAppRoutes`, `FlatwaveLanguageSelector`,
  `FlatwaveMDComponent`, `FlatwaveMDPageComponent`, `FlatwaveLanguageDetector`, `FlatwaveLanguageContext` —
  all composable components unchanged in API.
- **KEPT**: Full SSG pipeline — route HTML, sitemap, robots, route-manifest are still generated
  automatically during `vite build`. Nothing is removed or made opt-in.
- **KEPT**: All SSG hooks (`transformMarkdown`, `beforeRender`, `transformHtml`, `afterRender`,
  `emitFiles`).
- **MODIFIED**: README rewritten to show composable pattern as the primary usage: consumer builds their
  app with `FlatwaveLanguageRouter` + `FlatwaveMDPageComponent`; Vite generates static routes from those
  components automatically.
- **ADDED**: Documentation of strategy pattern in README showing how to extend build process without modifying core.

## Capabilities

### New Capabilities

- `routing-toolkit-non-intrusive`: Comprehensive specification for the full composable routing toolkit and
  how the SSG generates routes from it, replacing the current component-by-name approach.

### Modified Capabilities

- `flatwave-md-page-component`: `DefaultRenderStrategy` SHALL use `FlatwaveMDPageComponent` as the **only**
  renderer. The component must be server-render-compatible (fix ESM/CJS interop for
  `react-helmet-async` and `react-markdown` in Node SSG context).
- `flatwave-language-router`: The `routes` prop is now explicit (required). The component SHALL NOT silently fall back
  to calling `getRoutes(lang)` from the virtual module. Consumer supplies routes — typically via the
  `useFlatwaveRoutes(locale)` hook.
- `flatwave-app-routes`: Same routes-explicit requirement as `flatwave-language-router`.

## Impact

- `src/ssg/DefaultRenderStrategy.tsx`: Render path changed to use `FlatwaveMDPageComponent` as only renderer.
- `src/ssg/runSsg.ts`: `buildComponentsMap` function and call **removed entirely**. `componentsDir` removed from options.
- `src/react/FlatwaveMDPageComponent.tsx`: Must be fixed for server-side `renderToString` compatibility
  (react-helmet-async `HelmetProvider` wrapping; react-markdown namespace import for CJS/ESM interop).
- `examples/basic-react-site/`: `App.tsx` rewritten to use `FlatwaveLanguageRouter`; `componentsDir`
  removed from `vite.config.ts`; frontmatter `component` field **removed**.
- `packages/vite-plugin-flatwave-react/README.md`: Primary usage example updated.
