# Render Loop — Open Questions and Final Decisions

## Decision summary

| Question | Final decision | Status |
| --- | --- | --- |
| Routing strategy | Pathname routing only: `/es/about`, `/pt/program` | Resolved |
| Scroll restoration | Manual save/restore in v1 | Resolved |
| View Transitions API | Not supported in v1 | Resolved |
| Render-process ownership | One `src/render/` pipeline with server and browser adapters | Resolved |
| Source folders | Merge `prerender` and `render-loop`; delete empty/stale folders | Resolved |
| Client data fetching | No client data fetching for navigation | Resolved |
| 404 handling | Do not render client 404 or mutate current document for unknown routes | Resolved |

---

## Q1: Routing strategy

### Final decision

Use pathname routing only.

```text
/es/about
/pt/program
```

Hash routing is not supported.

### Rationale

- SEO is non-negotiable.
- Search engines and static hosts treat clean pathnames as first-class URLs.
- Hash routing conflicts with anchor links and creates poor URLs for content sites.
- The project has not been released, so there is no backward compatibility constraint.

### Implementation requirement

The client router must validate target paths against the serialized route inventory before calling `history.pushState()`.

---

## Q2: Scroll restoration

### Final decision

Use manual scroll restoration only in v1.

```text
new route navigation -> scroll to top
back/forward -> restore saved scroll position
```

### Why this replaces the earlier hybrid proposal

The previous artifact proposed hybrid View Transitions + manual fallback. That conflicts with the final View Transitions decision. To keep one render process and avoid unnecessary browser-specific branches, v1 should not include View Transitions code.

### Implementation requirement

`src/render/scroll-manager.ts` owns all scroll behavior. Navigation and controller code call it; they do not directly manage `window.scrollY`.

---

## Q3: View Transitions API

### Final decision

No View Transitions API support in v1.

### Rationale

- Not required for SEO or core navigation.
- Adds browser-specific behavior without solving a v1 requirement.
- Conflicts with the goal of one simple render process.
- Can be added later behind a feature flag if users request it.

### Out-of-scope examples

- Fade transitions.
- Slide transitions.
- `document.startViewTransition()`.
- Animation CSS for view-transition pseudo-elements.

---

## Q4: Should `prerender`, `ssg`, and `render-loop` remain separate folders?

### Final decision

No. They should become one `src/render/` pipeline.

### Reasoning

The current folder names describe historical implementation steps, not stable responsibilities:

- `prerender` is build-time rendering.
- `render-loop` is client-time rendering/navigation.
- `ssg` is empty.
- Both `prerender` and `render-loop` need shared route/content resolution, HTML injection, and page-context serialization.

Keeping them separate creates duplicated helpers and makes it easy to reintroduce multiple render processes.

### Target

```text
src/render/
├── types.ts
├── page.ts
├── html.ts
├── server.tsx
├── client.tsx
├── controller.tsx
├── navigation.ts
└── scroll-manager.ts
```

---

## Q5: Should the client fetch page data on navigation?

### Final decision

No.

### Rationale

- Static HTML already contains route/content data for the current page.
- The virtual module already exposes the full route inventory to the client bundle.
- Fetching would add runtime complexity and break the static-site model.
- SEO does not depend on client fetches.

### Implementation requirement

Navigation resolves the next page from the serialized route inventory. If the route is unknown, the navigation is rejected and the current document is not mutated.

---

## Q6: How should unknown routes behave?

### Final decision

Do not render a client 404 page in v1.

### Behavior

- If the clicked path is not in the serialized route inventory, do not call `history.pushState()`.
- Do not update the document head.
- Do not re-render the current page.
- Emit a development warning if available.

### Rationale

- The requirement explicitly says navigations to pages that do not currently exist do not update the document.
- A client 404 would imply a separate client routing model.
- Static hosts should handle unknown paths at the document request level.

---

## Q7: How should the render loop interact with React hydration?

### Final decision

The render controller owns the React root lifecycle.

### Required behavior

1. `main.tsx` calls `startRenderLoop({ root, App })`.
2. `startRenderLoop` creates one `RenderController`.
3. The controller calls `hydrateRoot(root, <App pageContext={initialContext} />)` once.
4. Later navigations call `root.render(<App pageContext={nextContext} />)`.
5. The controller updates the document head after route changes.

### Prohibited behavior

- `main.tsx` calling `createRoot(...).render(...)`.
- Multiple controllers starting on the same root.
- Client code reading `window.location.pathname` as the source of truth.

---

## Q8: What should be documented after implementation?

### Required documentation updates

- `README.md`
  - Add render-loop public API.
  - Show `main.tsx` using `startRenderLoop`.
  - Clarify pathname routing and static host requirements.
- `docs/ARCHITECTURE.md`
  - Replace separate prerender/render-loop diagrams with the single `src/render/` pipeline.
  - Show server and browser adapters under one render process.
- `dev-notes/render-loop/*`
  - Keep requirements, plan, and open questions aligned with implementation.

---

## Remaining implementation notes

These are not open design questions; they are implementation constraints to preserve while coding:

1. Keep `src/content/` independent from render internals.
2. Keep `src/seo/` independent from React internals.
3. Keep `src/react/` limited to hooks over virtual content.
4. Do not import browser-only modules from plugin build code.
5. Do not import server-only modules from browser entry code.
6. Do not duplicate HTML asset extraction or template injection.
7. Do not add View Transitions, hash routing, or client data fetching in v1.
