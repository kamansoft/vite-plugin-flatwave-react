# Render Loop — Single Render Process Implementation Plan

## Overview

Replace the current fragmented render code (`prerender/`, `render-loop/`, empty `ssg/`) with one render pipeline under `src/render/`. The pipeline has a server adapter for build-time SSR and a browser adapter for client hydration and navigation. SEO is the primary goal; pathname routing is mandatory.

## Source Layout Target

```
packages/vite-plugin-flatwave-react/src/
├── content/          # content ingestion only
├── react/            # React hooks over virtual content only
├── seo/              # SEO/head tag helpers only
├── cli/              # validation CLI only
├── render/           # single render pipeline
│   ├── types.ts
│   ├── page.ts
│   ├── html.ts
│   ├── server.tsx
│   ├── client.tsx
│   ├── controller.tsx
│   ├── navigation.ts
│   └── scroll-manager.ts
├── index.ts          # plugin orchestration only
└── virtual.d.ts
```

## Folders to Remove or Merge

| Current Path | Action |
|--------------|--------|
| `src/prerender/` | Merge into `src/render/` |
| `src/render-loop/` | Merge into `src/render/` |
| `src/ssg/` | Delete |
| Root `src/prerender/` (outside package) | Delete |

## Public API

Expose runtime as `vite-plugin-flatwave-react/render-loop` (points to `dist/render/client.js`).

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

## Core Decisions (Resolved)

- Routing: pathname only (`/es/about`), no hash
- Scroll: manual save/restore, no View Transitions in v1
- Client data: no fetch on navigation; use serialized route inventory
- Unknown routes: reject navigation, no client 404 render
- Hydration: `hydrateRoot` once, then `root.render()` for route changes
- One render process: server + browser adapters share pure helpers

## Implementation Tasks

1. **Create render pipeline types and pure helpers**
   - `src/render/types.ts` – `RenderMode`, `SerializedPageContext`, `RenderControllerOptions`
   - `src/render/page.ts` – route/content resolution, validation, serialization
   - `src/render/html.ts` – template, asset extraction, shell rendering, page-context script injection (DRY)

2. **Replace prerender module**
   - Move `createPrerenderer()` to `src/render/server.tsx`
   - Move component registry loading to `src/render/server.tsx`
   - Update tests to `src/render/*`
   - Delete `src/prerender/` and root `src/prerender/`

3. **Replace render-loop module**
   - Implement `navigation.ts`, `scroll-manager.ts`, `controller.tsx`, `client.tsx`
   - Delete `src/render-loop/`
   - Add package export `./render-loop` → `dist/render/client.js`
   - Extend `virtual.d.ts` for render-loop exports

4. **Integrate plugin orchestration**
   - Update `src/index.ts` to import `renderHtmlShell`, `extractAssets`, `createPrerenderPlugin` from `src/render/*`
   - Remove duplicated local helpers
   - Add `renderLoop` option to `FlatwaveContentOptions` / `NormalizedOptions`
   - Embed serialized page context in pre-rendered HTML

5. **Update example app**
   - `main.tsx` → `startRenderLoop({ root, App })`
   - `App.tsx` renders from `pageContext`, not `window.location.pathname`
   - `scripts/prerender.mjs` → thin wrapper around `createPrerenderer()`
   - `entry-server.tsx` uses same `PageContext` shape

6. **Tests**
   - Unit: route/content resolution, HTML injection, asset extraction, page-context script, route filtering, link interception, scroll restoration, unknown route rejection
   - Integration: virtual module exports, render-loop types
   - E2E: build + prerender pipeline, client navigation without reload

7. **Documentation**
   - `README.md` – render-loop API, `main.tsx` example, host requirements
   - `docs/ARCHITECTURE.md` – single `src/render/` pipeline diagram
   - `dev-notes/render-loop/*` – keep aligned

## Validation Commands

```bash
npm run build:plugin
npm run build:example
npm run prerender -w @flatwave/example-basic-react-site
npm test
npm test -- --coverage
```

## Dockerized Environment Validation

```bash
# Build and test in isolated container
docker build -t flatwave-test -f docker/Dockerfile.test .
docker run --rm flatwave-test npm run build:plugin && npm run build:example && npm test
```

## Manual Checks

1. Direct `/es/about` → HTML contains rendered article + all SEO metadata
2. Disable JS → content still visible
3. Click links → URL changes, no full reload
4. Back/forward → content and scroll restore
5. Unknown path → no client 404, no document mutation
6. Bundle imports → browser entry has no `react-dom/server`
7. Server entry → no `react-dom/client`

## Risks

| Risk | Mitigation |
|------|------------|
| Browser bundle includes SSR code | Strict dependency boundaries; test imports |
| Server bundle includes browser code | Strict dependency boundaries; test imports |
| Hydration mismatch | Align server/client markup; test SSR vs hydrated |
| Duplicate render logic | Single `src/render/html.ts` for all HTML helpers |

## Testing Requirements

- **Unit tests**: route/content resolution, HTML injection, asset extraction, page-context script, route filtering, link interception, scroll restoration, unknown route rejection
- **Integration tests**: virtual module exports, render-loop types, plugin orchestration
- **E2E tests**: build + prerender pipeline, client navigation without reload, scroll behavior, SEO metadata presence
- Run all tests in dockerized environment for isolation

## Documentation Updates

- `README.md` — concise render-loop API, `main.tsx` example, host requirements
- `docs/ARCHITECTURE.md` — single `src/render/` pipeline diagram, server/browser adapters

## Definition of Done

- `src/render/` is the only render pipeline
- `src/prerender/`, `src/render-loop/`, `src/ssg/` removed
- `src/index.ts` delegates to `src/render/`
- Example app uses `startRenderLoop()`
- Prerender script uses `createPrerenderer()`
- All tests pass (unit, integration, e2e)
- Tests run successfully in dockerized environment
- README and architecture docs updated