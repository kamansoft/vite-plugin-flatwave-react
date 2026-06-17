# Render Loop — Single Render Process Implementation Plan

## 1. Goal

Implement one render process for `vite-plugin-flatwave-react`:

- Build-time SSR/static HTML generation uses the same render pipeline as client hydration/navigation.
- The client never fetches page data during navigation.
- Static HTML remains SEO-complete and functional without JavaScript.
- Code organization follows SOLID and DRY: each folder has one responsibility and shared render behavior is not duplicated.

---

## 2. Architectural Decision

### 2.1 Source layout target

Move all render responsibilities into `packages/vite-plugin-flatwave-react/src/render/`.

```text
packages/vite-plugin-flatwave-react/src/
├── content/                 # content ingestion only
├── react/                   # React hooks over virtual content only
├── seo/                     # SEO/head tag helpers only
├── cli/                     # validation CLI only
├── render/                  # single render pipeline
│   ├── types.ts
│   ├── page.ts
│   ├── html.ts
│   ├── server.tsx
│   ├── client.tsx
│   ├── controller.tsx
│   ├── navigation.ts
│   └── scroll-manager.ts
├── index.ts                 # plugin orchestration only
└── virtual.d.ts
```

### 2.2 Folders to remove or merge

| Current path | Action | Reason |
| --- | --- | --- |
| `src/prerender/` | Merge into `src/render/` | It is a render adapter, not an independent process. |
| `src/render-loop/` | Merge into `src/render/` | Current files are incomplete and duplicate render/navigation concerns. |
| `src/ssg/` | Delete | Empty folder. |
| Root `src/prerender/` | Delete or merge | Stale duplicate outside package source. |

### 2.3 Public API compatibility

The package is not released, so breaking internal paths is allowed. For discoverability, expose the runtime API as:

```json
"./render-loop": {
  "types": "./dist/render/client.d.ts",
  "import": "./dist/render/client.js"
}
```

The source implementation lives under `src/render/`, but consumers import from `vite-plugin-flatwave-react/render-loop`.

---

## 3. Render Pipeline Design

### 3.1 Core types

`src/render/types.ts`

```ts
export type RenderMode = 'server' | 'client';

export interface SerializedPageContext {
  locale: string;
  route: import('../types').FlatwaveRoute;
  content: import('../types').FlatwaveContentEntry;
}

export interface RenderControllerOptions {
  root: Element;
  App: React.ComponentType<{ pageContext: SerializedPageContext }>;
  basePath?: string;
  scrollToTop?: boolean;
}

export interface NavigationEvent {
  path: string;
  previousPath: string | null;
  type: 'push' | 'replace' | 'popstate';
}
```

### 3.2 Pure route/content resolution

`src/render/page.ts`

Responsibilities:

- Resolve a route by path.
- Resolve content by `route.contentId` and `route.locale`.
- Build `SerializedPageContext`.
- Expose route validation for client navigation.

No React, DOM, Vite, or filesystem dependencies.

### 3.3 HTML template and asset helpers

`src/render/html.ts`

Responsibilities:

- Load template.
- Extract scripts/styles from generated HTML.
- Render a non-prerender HTML shell when `prerender` is disabled.
- Inject pre-rendered app HTML.
- Inject serialized page context script.
- Render SEO head tags through `src/seo/metadata.ts`.

This removes duplicated logic from:

- `src/index.ts`
- `src/prerender/template.ts`
- `examples/basic-react-site/scripts/prerender.mjs`

### 3.4 Server adapter

`src/render/server.tsx`

Responsibilities:

- Load SSR entry module.
- Build component registry.
- Wrap `render(url, pageContext)`.
- Provide `createPrerenderer(options, index)`.
- Render route HTML through `renderPageToHtml`.

This replaces `src/prerender/renderer.ts` and `src/prerender/index.ts`.

### 3.5 Browser adapter

`src/render/client.tsx`

Responsibilities:

- Export `startRenderLoop()`.
- Export imperative navigation helpers.
- Export React hook `useFlatwaveRoute()`.
- Start exactly one `RenderController`.
- Hydrate existing `#root` once with `hydrateRoot`.
- Use the same React root for later navigation updates.

### 3.6 Controller

`src/render/controller.tsx`

Responsibilities:

- Own current page context.
- Resolve route/content from serialized inventory.
- Render initial page and navigation updates.
- Update document title/meta/canonical/alternate links.
- Coordinate navigation and scroll manager.
- Prevent overlapping render passes.

### 3.7 Navigation

`src/render/navigation.ts`

Responsibilities:

- Intercept same-origin `<a>` clicks.
- Ignore external, cross-origin, downloads, `target`, modifier-key, mailto/tel, and hash-only links.
- Validate target path against serialized route inventory.
- Use `history.pushState` for new navigations.
- Use `history.replaceState` only when explicitly requested.
- Listen to `popstate`.

### 3.8 Scroll manager

`src/render/scroll-manager.ts`

Responsibilities:

- Save scroll before navigation.
- Restore saved scroll on back/forward.
- Scroll to top for new pages.
- No View Transitions API in v1.

---

## 4. Implementation Tasks

### Task 1 — Add render pipeline types and pure helpers

1. Create `src/render/types.ts`.
2. Create `src/render/page.ts`.
3. Move `extractAssets`, template loading, shell rendering, and page-context injection into `src/render/html.ts`.
4. Move `filterRoutesForPrerender` into `src/render/page.ts` or `src/render/server.tsx` depending on dependency scope.

### Task 2 — Replace prerender module

1. Move `createPrerenderer()` from `src/prerender/index.ts` into `src/render/server.tsx`.
2. Move component registry loading into `src/render/server.tsx`.
3. Update tests from `src/prerender/*` to `src/render/*`.
4. Delete `src/prerender/`.
5. Delete root `src/prerender/` if it remains unused.

### Task 3 — Replace render-loop module

1. Move browser router/navigation/controller logic into:
   - `src/render/navigation.ts`
   - `src/render/scroll-manager.ts`
   - `src/render/controller.tsx`
   - `src/render/client.tsx`
2. Delete `src/render-loop/`.
3. Add package export `./render-loop` pointing to `dist/render/client.js`.
4. Extend `src/virtual.d.ts` for render-loop exports.

### Task 4 — Integrate plugin orchestration

1. Update `src/index.ts` to import `renderHtmlShell`, `extractAssets`, and `createPrerenderPlugin` from `src/render/*`.
2. Remove duplicated local helpers from `src/index.ts`.
3. Add `renderLoop` option to `FlatwaveContentOptions` and `NormalizedOptions`.
4. When `prerender: true`, embed serialized page context in each pre-rendered HTML file.
5. Ensure non-prerender shells still emit valid static HTML.

### Task 5 — Update example app

1. Replace `examples/basic-react-site/src/main.tsx` with render-loop startup.
2. Update `App.tsx` to render from `pageContext`, not `window.location.pathname`.
3. Replace `examples/basic-react-site/scripts/prerender.mjs` with a thin wrapper around `createPrerenderer()`.
4. Verify `entry-server.tsx` uses the same `PageContext` shape as the render pipeline.

### Task 6 — Tests

Add or update tests for:

- Route/content resolution.
- HTML shell rendering.
- Asset extraction and template injection.
- Serialized page context script injection.
- `createPrerenderer()` route filtering.
- Client navigation link interception.
- Manual scroll restoration.
- Unknown route rejection.
- Public `render-loop` virtual exports/types.

### Task 7 — Documentation

Update after implementation:

- `README.md`
- `docs/ARCHITECTURE.md`
- `dev-notes/render-loop/requirements.md`
- `dev-notes/render-loop/plan.md`
- `dev-notes/render-loop/open-questions.md`

---

## 5. Validation Plan

Run:

```bash
npm run build:plugin
npm run build:example
npm run prerender -w @flatwave/example-basic-react-site
npm test
npm test -- --coverage
```

Manual checks:

1. Open `/es/about` directly: HTML contains rendered article and SEO metadata.
2. Disable JavaScript and reload: page content remains visible.
3. Click navigation links: URL changes without full page reload.
4. Browser back/forward: content and scroll position restore correctly.
5. Open unknown path: no client 404 render or document mutation.
6. Inspect bundle imports: browser entry does not import `react-dom/server`.
7. Inspect server entry: server code does not import `react-dom/client`.

---

## 6. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Browser bundle accidentally includes SSR code | Keep `client.tsx` dependency-only on `page.ts`, `navigation.ts`, `controller.tsx`, and React client. |
| Server bundle accidentally includes browser code | Keep `server.tsx` dependency-only on React server and pure helpers. |
| Duplicate render logic returns | Put template/assets/page-context helpers in `src/render/html.ts` and update all callers. |
| Hydration mismatch | Keep server and client `App` markup aligned; test SSR HTML vs hydrated output. |
| Static host serves wrong file for deep links | Document per-route output and fallback requirements. |
| Scroll restoration regresses | Add focused unit tests for scroll manager and navigation ordering. |

---

## 7. Definition of Done

- `src/render/` exists and is the only render pipeline.
- `src/prerender/`, `src/render-loop/`, and `src/ssg/` no longer exist in package source.
- Root `src/prerender/` is deleted or intentionally removed.
- `src/index.ts` delegates render responsibilities to `src/render/`.
- Example app uses `startRenderLoop()`.
- Prerender script uses `createPrerenderer()`.
- All tests pass.
- README and architecture docs reflect the single render process.
