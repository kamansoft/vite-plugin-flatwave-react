# Render Loop — Requirements and Architecture Decisions

## 1. Goal

Add a single render process for `vite-plugin-flatwave-react` so that:

1. The first visit to any route loads complete static HTML with SEO metadata and rendered content.
2. Subsequent same-site navigations are handled by React without full page reloads.
3. The same architectural model is used in development and production.
4. The codebase has one render pipeline, not separate ad-hoc prerender, SSG, and render-loop implementations.

SEO is the primary goal. Pathname routing is mandatory.

---

## 2. Current State Audit

### Existing folders and their status

| Folder / file | Current status | Decision |
| --- | --- | --- |
| `src/content/` | Scanner, parser, validator, route builder, indexer | Keep. Owns content ingestion only. |
| `src/seo/` | SEO metadata helpers | Keep. Owns HTML head tag rendering only. |
| `src/react/` | React hooks over `virtual:flatwave/content` | Keep. Owns content hooks only. |
| `src/prerender/` | SSR/pre-render wrapper, template injection, route filtering | Merge into `src/render/`. The name describes one build-time adapter, not a separate process. |
| `src/render-loop/` | Incomplete client router/navigation/client files | Merge into `src/render/` as the browser adapter. |
| `src/ssg/` | Empty | Delete. |
| `src/index.ts` | Plugin factory plus duplicated asset/shell rendering | Keep plugin orchestration, remove render-specific duplication. |
| `src/prerender/template.ts` | Duplicates asset extraction and template injection used elsewhere | Move helpers into `src/render/html.ts`. |
| `examples/basic-react-site/scripts/prerender.mjs` | Duplicates prerender logic from plugin package | Replace with `createPrerenderer()` from the package. |
| Root `src/prerender/` | Stale duplicate outside package source | Delete or merge before implementation. |

### Current contradictions that must be fixed

| Contradiction | Resolution |
| --- | --- |
| Requirements say hydrate with `hydrateRoot`, but example `main.tsx` uses `createRoot`. | v1 must use `hydrateRoot` on initial load, then `root.render()` for later navigations. |
| Q2 says hybrid View Transitions + manual scroll, while Q3 says no View Transitions in v1. | v1 uses manual scroll restoration only. View Transitions are explicitly out of scope. |
| Requirements say the client does not build or maintain a routing structure, but it must know valid routes. | The client reads an immutable serialized route inventory from `virtual:flatwave/content`; it does not rebuild or fetch it. |
| Requirements say the render loop exits after a page is rendered, but navigation is ongoing. | A render pass exits after DOM commit. The `RenderController` stays alive for the page lifetime. |
| `prerender`, `ssg`, and `render-loop` are treated as separate render processes. | There is one `render` pipeline with server and browser adapters. |

---

## 3. Non-Negotiable Requirements

### 3.1 SEO and static HTML

- Initial HTML must contain:
  - `<html lang>`
  - `<title>`
  - `<meta name="description">`
  - canonical link
  - robots meta
  - Open Graph and Twitter tags
  - JSON-LD when provided
  - `hreflang` alternate links
  - fully rendered page body content
- Static HTML must work without JavaScript.
- JavaScript must enhance the existing DOM, not replace the first paint with an empty shell.

### 3.2 Routing

- Use pathname routing only: `/es/about`, `/pt/program`.
- Hash routing is not supported.
- Client navigation uses the History API.
- Unknown same-origin routes must not update the document or render a client 404 in v1.
- Static hosts must be configured to serve per-route files or rewrite unknown paths safely.

### 3.3 Client navigation

- Intercept same-origin `<a>` clicks that point to known Flatwave routes.
- Respect external links, downloads, `target`, modifier keys, mailto/tel links, and hash-only links.
- Handle browser back/forward through `popstate`.
- Do not fetch page data on navigation.
- Resolve page context from serialized route/content data already present in the bundle.
- Update SEO metadata in the document head after navigation.
- Use `hydrateRoot` for the initial DOM takeover and `root.render()` for later route changes.

### 3.4 Scroll behavior

- v1 uses manual scroll restoration only.
- Save scroll position before navigation.
- Restore saved scroll on back/forward.
- Scroll to top for new route navigations.
- No View Transitions API in v1.

### 3.5 Hydration and component behavior

- Components may become interactive after hydration.
- Server-rendered HTML remains functional without JavaScript.
- Client-only code must not run during SSR.
- The render controller must not create multiple React roots for the same `#root`.
- Component boundaries are React-owned after hydration.

---

## 4. Target Architecture

### 4.1 One render pipeline

The render pipeline is `src/render/`.

```text
src/render/
├── types.ts              # RenderContext, SerializedPageContext, RenderMode
├── page.ts               # Pure route/content resolution and serialization
├── html.ts               # Template, asset extraction, shell rendering, page-context script
├── server.tsx            # SSR adapter: render page to HTML string
├── client.tsx            # Browser adapter: startRenderLoop()
├── controller.tsx        # RenderController owns hydration, route rendering, head updates
├── navigation.ts         # Link interception and History API routing
└── scroll-manager.ts     # Manual scroll save/restore
```

### 4.2 Responsibilities

| Concern | Owner |
| --- | --- |
| Markdown scanning and validation | `src/content/` |
| SEO tag generation | `src/seo/` |
| Virtual content module | `src/index.ts` + `src/react/` |
| Build-time SSR rendering | `src/render/server.tsx` |
| Template/asset/page-context HTML injection | `src/render/html.ts` |
| Browser navigation and hydration | `src/render/client.tsx` |
| Route/content resolution | `src/render/page.ts` |
| React content hooks | `src/react/` |

### 4.3 Data flow

```text
Build time
  Markdown files
    -> content/indexer.ts
    -> FlatwaveContentIndex
    -> virtual:flatwave/content
    -> render/page.ts resolves route + content
    -> render/server.tsx renders HTML string
    -> render/html.ts injects assets + serialized page context
    -> dist/{locale}/{route}/index.html

Initial browser load
  GET /es/about
    -> static HTML with rendered content
    -> script starts render/client.tsx
    -> RenderController hydrates existing #root
    -> page is interactive

Client navigation
  click <a href="/es/program">
    -> navigation.ts validates known route
    -> history.pushState()
    -> RenderController resolves serialized route/content
    -> update document head
    -> root.render(<App pageContext={...} />)
    -> manual scroll restoration
```

---

## 5. Public API Shape

### 5.1 Plugin option

```ts
renderLoop?: boolean | {
  enabled?: boolean;        // default: true when prerender is enabled
  basePath?: string;        // default: ''
  scrollToTop?: boolean;    // default: true
};
```

If `renderLoop` is omitted and `prerender: true`, it is enabled by default.

### 5.2 Runtime export

Recommended public export:

```ts
import {
  startRenderLoop,
  navigateTo,
  getCurrentPath,
  onNavigate,
  getPageContext,
  useFlatwaveRoute,
} from 'vite-plugin-flatwave-react/render-loop';
```

Even if the source folder is `src/render/`, the public API can remain `render-loop` for discoverability.

### 5.3 Example app entry

`examples/basic-react-site/src/main.tsx` should become the single browser entry:

```tsx
import { startRenderLoop } from 'vite-plugin-flatwave-react/render-loop';
import { App } from './App';
import './styles.css';

startRenderLoop({
  root: document.getElementById('root')!,
  App,
});
```

`App.tsx` should stop reading `window.location.pathname` directly. It should render from the page context supplied by the render controller.

---

## 6. Success Criteria

- One render pipeline in source: `src/render/`.
- No empty `src/ssg/` folder.
- No duplicate `prerender` folder inside and outside the package.
- No duplicate `extractAssets`, `injectPreRenderedHtml`, or `renderRouteHtml` implementations.
- Initial static HTML contains rendered content and all SEO metadata.
- Client navigation uses pathname History API without full reloads.
- Initial hydration uses `hydrateRoot`; later updates use the same React root.
- Manual scroll restoration works for back/forward and new-page scroll-to-top.
- Unknown routes do not render a client 404 or mutate the current document.
- `npm run build:plugin`, `npm run build:example`, and prerender pipeline pass.
- Unit and integration tests cover route resolution, HTML injection, navigation, and scroll behavior.

---

## 7. Out of Scope for v1

- Hash routing.
- View Transitions API animations.
- Client-side data fetching.
- Code splitting per route.
- Islands or partial hydration.
- Server runtime.
- Runtime locale detection as the primary routing model.
- Client-side 404 page rendering.
