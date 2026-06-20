## Why

The plugin currently acts as an intrusive owner of rendering, routing, and SSG logic rather than a composable toolkit. Third-party applications cannot build their own page structures, routing strategies, or SSG side-effects using the plugin's primitives — they must either accept the `DefaultRenderStrategy` wholesale or rewrite the entire stack. The `current-working-project-with-features` prototype already demonstrates the correct pattern (composable `SimplePage`, extensible `LanguageRouter`, plugin hooks for custom file emission) — this change lifts those patterns into the published package as first-class, extensible React components.

## What Changes

- **NEW** Export `FlatwaveMDComponent` — a base React component that renders a markdown source string, exposes frontmatter values as typed props, and is designed to be extended or composed by third-party apps.
- **NEW** Export `FlatwaveMDPageComponent` — extends `FlatwaveMDComponent` with page-level concerns: SEO head tags (title, description, canonical, OG) and a page wrapper structure; also designed to be extended.
- **NEW** Export `FlatwaveLanguageRouter` — a `BrowserRouter`-based component that handles automatic browser-language detection, URL-prefix-based language routing, and i18n sync; accepts a `routes` prop so third-party apps define their own pages; internally extensible via a `LanguageDetector` sub-component that can be replaced.
- **NEW** Add `emitFiles` hook to the SSG pipeline — a `RenderHooks` lifecycle hook called once after all routes are rendered, receiving the full content index and route manifest, enabling third-party plugins to emit arbitrary files (e.g., a `navigation.json` containing `{ url, publicName }` entries for each public route).
- **BREAKING** The plugin's `react` export surface changes: it previously exported only hooks; it now also exports the components above. Import paths that destructure from `@kamansoft/vite-plugin-flatwave-react` remain valid but new named exports are added.
- `DefaultRenderStrategy` is retained but its role is narrowed: it becomes a reference SSG renderer that uses `FlatwaveMDPageComponent` internally, demonstrating the composition pattern.
- `README.md` is rewritten to lead with the component-first usage model.

## Capabilities

### New Capabilities

- `flatwave-md-component`: Base React component for rendering markdown content with frontmatter-derived props; language-aware; designed for extension.
- `flatwave-md-page-component`: Full-page React component extending the base; adds SEO head management and page wrapper; designed for extension.
- `flatwave-language-router`: Composable router component with automatic language detection, URL-prefix routing, and user-defined route configuration; extensible detector and route slots.
- `flatwave-app-routes`: Render-prop component that maps `FlatwaveRoute[]` to `react-router-dom` `<Routes>`; accepts optional routes override prop; allows custom page component mapping via `renderPage`.
- `flatwave-language-selector`: UI component for language switching; uses `FlatwaveLanguageContext` for available languages; accepts custom render prop for styling.
- `flatwave-layout-wrapper`: `layoutWrapper` prop for shared page layout (Header/Footer), used by `FlatwaveLanguageRouter` and `FlatwaveAppRoutes`.
- `ssg-custom-emitters`: `emitFiles` hook in the SSG pipeline that lets third-party Vite plugin consumers emit arbitrary build artifacts (JSON, XML, text) derived from the complete content index after all routes are rendered.

### Modified Capabilities

<!-- No existing specs to modify — openspec/specs/ is currently empty -->

## Impact

- `packages/vite-plugin-flatwave-react/src/react/` — new component files added; `index.ts` updated to re-export them.
- `packages/vite-plugin-flatwave-react/src/ssg/RenderPipeline.ts` — new `emitFiles` hook stage appended.
- `packages/vite-plugin-flatwave-react/src/ssg/runSsg.ts` — calls the new `emitFiles` hook after the rendering loop.
- `packages/vite-plugin-flatwave-react/src/types.ts` — `RenderHooks` interface gains `emitFiles` optional callback.
- `packages/vite-plugin-flatwave-react/src/index.ts` — re-exports components from `./react`.
- `packages/vite-plugin-flatwave-react/package.json` — `react-markdown` and `react-helmet-async` added as peer dependencies (they are already used in the working project; consumers who extend the components must install them).
- `packages/vite-plugin-flatwave-react/src/ssg/DefaultRenderStrategy.tsx` — refactored to use `FlatwaveMDPageComponent` instead of inline JSX, demonstrating the composition model.
- `README.md` — rewritten with component-first documentation, migration notes, and extension examples.
- `examples/basic-react-site/` — updated to demonstrate the new components and `FlatwaveLanguageRouter`.
