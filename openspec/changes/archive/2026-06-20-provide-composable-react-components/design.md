## Context

The plugin currently delivers SSG output (static HTML files) through a closed pipeline. Third-party consumers interact with it only via Vite config options — they cannot reuse, extend, or substitute any of the rendering primitives without reimplementing them from scratch. The `current-working-project-with-features` prototype demonstrates the correct mental model: composable page components (`SimplePage`), language-aware routing (`LanguageRouter`), and a content loader that bridges the virtual module to React components. None of these building blocks are exported by the published package today.

The change introduces seven capabilities:

1. `FlatwaveMDComponent` — base React component for markdown rendering
2. `FlatwaveMDPageComponent` — full-page extension with SEO head management
3. `FlatwaveLanguageDetector` — language detection logic only (no routing)
4. `FlatwaveAppRoutes` — route mapping component with `renderPage` for page rendering
5. `FlatwaveLanguageRouter` — convenience wrapper combining all routing components
6. `FlatwaveLanguageSelector` — UI component for language switching (uses context for available languages)
7. `emitFiles` SSG hook — custom build-time file emission after the render loop

The working project's `LanguageRouter.tsx`, `SimplePage.tsx`, and `contentLoader.ts` are the direct reference implementations that these components generalise and elevate into the package.

---

## Goals / Non-Goals

**Goals:**

- Export composable React components that third-party apps can use, extend, or replace.
- Keep the SSG pipeline fully functional after the refactor — `DefaultRenderStrategy` must still produce correct output.
- Support both SSG rendering mode (pre-compiled HTML injected as `markdownHtml`) and client-side rendering mode (raw markdown rendered via `react-markdown`).
- Allow consumers to generate arbitrary build-time output files (JSON, XML, etc.) from the content index after all routes are rendered.
- Maintain backward compatibility in the Vite plugin API (`flatwaveContent()` options, virtual module API, hooks interface).

**Non-Goals:**

- Providing a complete, opinionated application framework — consumers build their own app shell.
- Owning i18n library choice — `FlatwaveLanguageRouter` does URL-based language routing but does not import or configure any i18n library.
- Providing pre-built navigation components — that is the consumer's job, aided by `emitFiles` to generate data (e.g. `navigation.json`).
- CSS / styling — components accept `className` and `style` props but ship with no styles.

---

## Decisions

### D1: Composition over class inheritance for extensibility

**Decision**: Components are designed for React composition (children, render props, prop drilling, TypeScript generics) rather than class-based inheritance.

**Rationale**: React functional components are not classes. The extensibility model in React is composition — a consumer wraps or overlays a component rather than subclassing it. This is consistent with the React ecosystem and does not require `class` syntax.

**How it looks for consumers**:

```tsx
// Extend FlatwaveMDComponent by wrapping it
function MyContent(props: FlatwaveMDComponentProps) {
  return (
    <FlatwaveMDComponent {...props}>
      {(rendered) => <div className="my-wrapper">{rendered}</div>}
    </FlatwaveMDComponent>
  );
}
```

**Alternative considered**: Class components with a `render()` method override. Rejected — incompatible with hooks, goes against modern React patterns.

---

### D2: FlatwaveMDComponent accepts both compiled HTML and raw markdown

**Decision**: The component accepts two mutually exclusive content props:

- `markdownHtml: string` — pre-compiled HTML (used in SSG pipeline)
- `markdown: string` — raw markdown source (rendered client-side via `react-markdown`)

When `markdownHtml` is provided it uses `dangerouslySetInnerHTML`. When `markdown` is provided it uses `react-markdown`. Consumers should prefer `markdownHtml` in SSG contexts (it is always available via the virtual module's `body` field after compilation) and may use `markdown` for pure client-side rendering.

**Rationale**: In the SSG pipeline, the markdown is compiled to HTML before the component is called (see `runSsg.ts` lines 78–87, where `compileMarkdownToHtml` is called before `strategy.render`). The component receives compiled HTML, not raw markdown. For client-side-only usage (e.g. preview mode), raw markdown is more convenient.

**Alternative considered**: Always use `react-markdown` and re-parse at render time. Rejected — this re-does work already done by the build pipeline and adds a runtime dependency that can be avoided in SSG consumers.

---

### D3: FlatwaveLanguageRouter is split into three exported layers

**Decision**: Export three separate things from the router module:

1. `FlatwaveLanguageDetector` — a renderless component (renders `children`) that detects browser language, syncs with URL prefix, and calls `onLanguageChange`. Can be used inside any existing `BrowserRouter`.
2. `FlatwaveAppRoutes` — a render-prop component that maps `FlatwaveRoute[]` (from the virtual module) to `react-router-dom` `<Routes>`, calling a user-supplied `renderPage` function for each route. Does not hardcode any page components.
3. `FlatwaveLanguageRouter` — a convenience wrapper that combines `BrowserRouter` + `FlatwaveLanguageDetector` + `FlatwaveAppRoutes`. This matches the pattern in the working project's `LanguageRouter.tsx`.

**Rationale**: Consumers who already have a `BrowserRouter` (e.g. from another library) can use just `FlatwaveLanguageDetector`. Consumers who want full control over route rendering use `FlatwaveAppRoutes` with their own `renderPage`. The convenience `FlatwaveLanguageRouter` covers the common case (mirrors the working project).

**Alternative considered**: A single monolithic router component with many props. Rejected — limits extensibility and forces consumers into a fixed structure.

---

### D4: FlatwaveLanguageRouter does not depend on any i18n library

**Decision**: The router does NOT import `i18next`, `react-i18next`, or any other i18n library. It exposes `onLanguageChange(lang: string)` callbacks and reads/writes only the URL pathname for language prefix management. i18n sync is the consumer's responsibility.

**Rationale**: The working project's `LanguageRouter.tsx` imports `i18n` from `../config/i18n` and calls `i18n.changeLanguage()`. This is correct for that app but would lock the plugin to a specific i18n setup. Consumers may use `i18next`, `react-intl`, `lingui`, or none at all.

**How i18n sync works**: The consumer connects `onLanguageChange` to their i18n library:

```tsx
<FlatwaveLanguageRouter
  supportedLanguages={['es', 'pt']}
  defaultLanguage="es"
  onLanguageChange={(lang) => i18n.changeLanguage(lang)}
  renderPage={(route, lang) => <MyPage route={route} lang={lang} />}
/>
```

---

### D5: emitFiles hook receives the complete content index and returns SsgOutputFile[]

**Decision**: Add an `emitFiles` hook to `RenderHooks`:

```ts
emitFiles?: (
  context: EmitFilesContext
) => Promise<SsgOutputFile[]> | SsgOutputFile[];
```

Where `EmitFilesContext` contains:

- `routes: FlatwaveRoute[]` — all public routes
- `contentIndex: FlatwaveContentIndex` — full index with all locales
- `renderedFiles: SsgOutputFile[]` — all HTML files already emitted
- `locale: undefined` — not route-specific (this is a post-loop hook)

**Rationale**: This allows consumers to emit derived files. Example — a `navigation.json` generator:

```ts
hooks: {
  emitFiles: ({ routes }) => [
    {
      fileName: 'navigation.json',
      source: JSON.stringify(
        routes.map((r) => ({ url: r.path, publicName: r.metadata.title })),
        null,
        2
      ),
    },
  ];
}
```

`RenderPipeline` gets a new `executeEmitFiles` method. `runSsg.ts` calls it once after the rendering loop, before the route manifest emission.

**Alternative considered**: A `afterAllRoutes` hook that receives `emitFile` callback from Vite context. Rejected — the hook pipeline runs inside `runSsg.ts` which already uses Rollup's `this.emitFile`. Returning an array of `SsgOutputFile` objects is simpler and consistent with the existing `SsgOutputFile[]` return type of `runSsg`.

---

### D6: DefaultRenderStrategy uses FlatwaveMDPageComponent internally

**Decision**: `DefaultRenderStrategy.tsx` is refactored to use `FlatwaveMDPageComponent` as its rendering component, replacing the inline `<Component {...props} />` pattern. This serves as the canonical demonstration of how to use the components in an SSG context.

**Rationale**: This ensures `FlatwaveMDPageComponent` is actually exercised in the default path, preventing the components from becoming untested abstractions. It also simplifies `DefaultRenderStrategy` by removing its own graceful-degradation logic (which moves into `FlatwaveMDPageComponent`).

---

### D7: TypeScript generics for typed frontmatter extension

**Decision**: Components use a generic type parameter for frontmatter:

```ts
interface FlatwaveMDComponentProps<TFrontmatter extends FlatwaveFrontmatter = FlatwaveFrontmatter> {
  frontmatter: TFrontmatter;
  markdownHtml?: string;
  markdown?: string;
  locale: string;
  children?: (rendered: React.ReactNode) => React.ReactNode;
}
```

**Rationale**: Consumers who define their own frontmatter schema (e.g. adding `audioUrl: string`) can get full type safety when extending the components.

---

### D8: FlatwaveLanguageSelector is a UI component for language switching

**Decision**: Export a `FlatwaveLanguageSelector` component that renders a language switcher using `FlatwaveLanguageContext` for available languages and current locale. It accepts a `renderOption?: (lang: string, label: string) => React.ReactNode` render prop for customizing the UI and an `onSelect?: (lang: string) => void` callback for post-selection actions (e.g., analytics, additional i18n sync).

**Rationale**: Language switching is a common need. The working project implements this inline in various places. Providing a reusable selector component reduces boilerplate and ensures the selector stays in sync with `supportedLanguages`.

**How it looks for consumers**:

```tsx
<FlatwaveLanguageSelector
  renderOption={(lang, label) => <button data-lang={lang}>{label}</button>}
  onSelect={(lang) => analytics.track('language_change', { lang })}
/>
```

**Alternative considered**: A headless hook `useFlatwaveLanguageSwitcher()` that returns `(currentLang, options, selectLang)`. Rejected — the selector component is simple, stateless, and composable. A hook adds indirection without clear benefit.

---

### D9: Dynamic slug route pattern for content-driven pages

**Decision**: `FlatwaveLanguageRouter` SHALL accept an additional `dynamicRoute?: DynamicRouteConfig` prop to handle content-driven pages where the path is not known at build time (e.g., `/{lang}/:slug` for markdown pages). The `DynamicRouteConfig` contains:

```ts
interface DynamicRouteConfig {
  path: string; // Route path pattern, e.g., "/:slug"
  renderPage: (params: { slug: string; lang: string }) => React.ReactNode; // Render function receiving slug param
}
```

**Rationale**: The working project's `DynamicSimplePageWrapper` demonstrates a hardcoded `/:slug` route that loads content at runtime. The plugin's static route list from `getRoutes(lang)` does not cover this pattern — consumers need a way to declare dynamic routes that use the virtual module's content lookup.

**How consumers use it**:

```tsx
<FlatwaveLanguageRouter
  ...
  dynamicRoute={{
    path="/:slug",
    renderPage={({ slug }, lang) => {
      const content = useFlatwaveContent(slug!, lang);
      return <FlatwaveMDPageComponent {...content} />;
    }
  }}
/>
```

**Alternative considered**: Require consumers to wrap their own `<Route path=":slug">` inside `FlatwaveLanguageDetector`. Rejected — this loses the automatic locale injection and the clean declarative API.

---

### D10: layoutWrapper prop for shared page layout

**Decision**: `FlatwaveLanguageRouter` and `FlatwaveAppRoutes` SHALL accept an optional `layoutWrapper?: React.ComponentType<{ children: React.ReactNode; locale: string }>` prop. When provided, all rendered pages SHALL be wrapped inside this layout component, matching the `PagesLayout` pattern in the working project.

**Rationale**: Third-party apps need a shared layout for headers, footers, navigation. React router's `<Outlet />` pattern with a layout route is the standard approach, but our `renderPage` prop doesn't use `<Outlet />`. Instead, we provide the layout as a wrapper.

**How consumers use it**:

```tsx
<FlatwaveLanguageRouter
  ...
  layoutWrapper={({ children, locale }) => (
    <div lang={locale}>
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  )}
  renderPage={(route, lang) => <FlatwaveMDPageComponent {...getContent(route.contentId, lang)} />}
/>
```

**Alternative considered**: Require consumers to use `<Routes><Route element={<MyLayout />}><Route ... /></Route></Routes>` pattern. Rejected — adds complexity; the layoutWrapper prop is simpler and works with our render-prop architecture.

---

## Risks / Trade-offs

**[Risk] `dangerouslySetInnerHTML` in FlatwaveMDComponent**
→ Mitigation: The compiled HTML originates from the plugin's own markdown compiler (`unified` + `remark` + `rehype`), which is controlled. For client-side usage with `markdown` prop, `react-markdown` handles sanitisation. Document that `markdownHtml` should only come from trusted sources (i.e. the virtual module or the SSG pipeline).

**[Risk] react-markdown and react-helmet-async as new peer dependencies may break consumers who don't have them installed**
→ Mitigation: The components that require them are new additions — no existing consumer code uses them. Add clear install instructions in the README. Make component imports path-separated (`@kamansoft/vite-plugin-flatwave-react/react/FlatwaveMDComponent`) so consumers who don't need them don't pay the peer-dep requirement at all.

**[Risk] FlatwaveLanguageRouter's i18n-agnostic design means consumers must wire up i18n themselves**
→ Mitigation: Provide a clear documented example. The `onLanguageChange` callback pattern is familiar and works with any i18n library in 1–3 lines of code.

**[Risk] emitFiles hook returning SsgOutputFile[] means the hook runs to completion before any files are emitted — a long-running hook delays the entire build**
→ Mitigation: Document that `emitFiles` is for lightweight file generation (JSON, XML). Heavy processing should use a separate Vite plugin.

**[Risk] Refactoring DefaultRenderStrategy to use FlatwaveMDPageComponent changes its rendering output, potentially breaking existing SSG snapshots**
→ Mitigation: The outer HTML structure (template injection) does not change. The appHtml produced by the strategy is the only thing that changes, and it now matches what a consumer using FlatwaveMDPageComponent directly would produce. Add a migration note in the README.

---

## Migration Plan

1. Add new files to `packages/vite-plugin-flatwave-react/src/react/` — no existing files are modified in this step.
2. Add `emitFiles` to `RenderHooks` (additive, optional — no breaking change).
3. Update `RenderPipeline.ts` to add `executeEmitFiles` method.
4. Update `runSsg.ts` to call `executeEmitFiles` after the render loop.
5. Refactor `DefaultRenderStrategy.tsx` to use `FlatwaveMDPageComponent`.
6. Update `packages/vite-plugin-flatwave-react/src/react/index.ts` to export new components.
7. Update `packages/vite-plugin-flatwave-react/src/index.ts` to re-export react layer.
8. Update `packages/vite-plugin-flatwave-react/package.json` peer dependencies.
9. Update `examples/basic-react-site/` to demonstrate the new components.
10. Rewrite `README.md`.

No rollback is needed — all changes are additive except the `DefaultRenderStrategy` refactor, which is covered by the existing e2e test suite.

---

## Open Questions - Decided

### Q1: Should `FlatwaveLanguageDetector` expose a React Context for language state?

**DECISION: Option 1 selected** — Export `FlatwaveLanguageContext` alongside the component.

### Q2: Should `FlatwaveMDPageComponent` include a loading state for async content?

**DECISION: Option 1 selected** — Add `loadingFallback?: React.ReactNode` prop.

### Q3: Should `emitFiles` receive Rollup's `emitFile` function for bundle integration?

**DECISION: Option 1 selected** — Keep `SsgOutputFile[]` only, no Rollup coupling.

### Q4: Should `FlatwaveMDPageComponent` strip frontmatter from raw markdown string?

**DECISION: Option 1 selected** — Auto-strip frontmatter in `FlatwaveMDComponent` before rendering.

### Q5: Should the router provide a `useFlatwaveLanguage` hook for consuming locale?

**DECISION: Option 1 selected** — Export `useFlatwaveLanguage()` hook.

### Q1: Should `FlatwaveLanguageDetector` expose a React Context for language state?

**Problem**: The working project's `LanguageRouter` has `LanguageDetector` component that manages `isI18nReady` state and language detection internally. Third-party components deep in the tree (e.g., language selectors, content loaders) need access to the current locale and supported languages without receiving them via prop drilling.

**Technical Details**:

- Current working project passes `supportedLanguages` and `defaultLanguage` from `env` config via Vite environment variables
- The detector already tracks `locale` state internally
- React Context allows any descendant to call `useContext(FlatwaveLanguageContext)` to get `{ locale, supportedLanguages, defaultLanguage }`

**Options**:

1. **Export `FlatwaveLanguageContext` with default value** — Simple, stateless context with default values (`locale: ''`, `supportedLanguages: []`). Consumers can use `useContext(FlatwaveLanguageContext)` anywhere. Cost: ~15 lines of code.
2. **Provide only via `FlatwaveLanguageDetector` children pattern** — Pass locale/supportedLanguages to children via render prop. Consumers must structure code around the render prop. More explicit but more verbose.
3. **Export both Context and render-prop children** — Dual API: context for deep access + children render prop for immediate nesting. Maximum flexibility, potential confusion about which to use.

**Recommended**: Option 1 — Context is the React standard for cross-tree state. The implementation cost is minimal and it aligns with how consumers already consume context (e.g., `useContext` for theme, auth, etc.).

---

### Q2: Should `FlatwaveMDPageComponent` include a loading state for async content?

**Problem**: During client-side navigation (react-router), content may be loaded asynchronously. The working project's `LanguageDetector` shows a loading UI while i18n initializes (`!isI18nReady`). Similarly, `FlatwaveMDPageComponent` may need to show loading state while markdown content is being fetched.

**Technical Details**:

- SSG: content is pre-loaded, no async fetching needed
- SPA navigation: `useFlatwaveContent` hook may need to fetch content JSON or markdown
- The working project's `SimplePage` receives pre-fetched content from `DynamicSimplePageWrapper`, which handles the loading scenario upstream

**Options**:

1. **Add `loadingFallback?: React.ReactNode` prop** — When `markdownHtml` and `markdown` are both `undefined`, render `loadingFallback`. If `loadingFallback` is also absent, render `null`.
2. **Require consumers to handle loading upstream** — Like the working project, consumers pass `loadingFallback` at the route level before reaching the page component.
3. **Add `isLoading?: boolean` prop** — Explicit loading state control, more imperative but clearer intent.

**Recommended**: Option 1 — The `loadingFallback` prop is simple, declarative, and mirrors the pattern in the working project. It keeps the component self-contained.

---

### Q3: Should `emitFiles` receive Rollup's `emitFile` function for bundle integration?

**Problem**: The current `emitFiles` design returns `SsgOutputFile[]` which are emitted as static assets. Some consumers may want to emit files that integrate with the Rollup bundle (e.g., CSS, JS, or images that should be hashed and included in the manifest).

**Technical Details**:

- Rollup `emitFile` is available via `this.emitFile` in plugin context
- Static assets vs bundle assets: `SsgOutputFile[]` goes directly to disk; Rollup assets get hashed names and manifest entries
- The hook runs in `runSsg.ts` which already has access to Rollup plugin context via `this`

**Options**:

1. **Keep `SsgOutputFile[]` only** — Simple, works for all documented cases (navigation.json, sitemap extensions, custom XML/JSON). No Rollup coupling.
2. **Add `emitFile` callback to context** — `EmitFilesContext.emitFile?: (file: SsgOutputFile) => string` (hashed path). Requires Rollup coupling in hook signature.
3. **Combine both** — Add `emitFile` as optional property in `EmitFilesContext`, type it as `unknown` to avoid Rollup coupling: `emitFile?: (file: SsgOutputFile) => string`.

**Recommended**: Option 1 — Keep `SsgOutputFile[]` only. Consumers who need hashed assets should use a separate Vite plugin or the existing `ssr.external` configuration. This keeps the API simple and decoupled.

---

### Q4: Should `FlatwaveMDPageComponent` strip frontmatter from raw markdown string?

**Problem**: When using the `markdown` prop for client-side rendering, consumers may pass a raw markdown string that includes YAML frontmatter. The working project strips frontmatter with `markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/,'')` in `SimplePage.tsx`.

**Technical Details**:

- The virtual module (`virtual:flatwave/content`) strips frontmatter at build time via `gray-matter`
- Direct markdown string use (e.g., editor preview) may contain frontmatter
- `react-markdown` will render `---` as horizontal rule (which is incorrect)

**Options**:

1. **Strip frontmatter in `FlatwaveMDComponent`** — Automatically remove `---\n...\n---` block before rendering with `react-markdown`.
2. **Document that consumers must strip frontmatter** — Clear documentation stating the `markdown` prop should not contain frontmatter.
3. **Add `stripFrontmatter?: boolean` prop** — Optional auto-stripping, defaults to `false` for backward compatibility.

**Recommended**: Option 1 — Auto-stripping is defensive. The cost is minimal (use `gray-matter` or a simple regex) and it prevents a common bug. Consumers who intentionally want frontmatter rendered can still use `markdownHtml` prop.

---

### Q5: Should the router provide a `useFlatwaveLanguage` hook for consuming locale?

**Problem**: Consumers need to read the current locale in various components. While `FlatwaveLanguageContext` allows `useContext(FlatwaveLanguageContext)`, a dedicated hook would be more ergonomic and type-safe.

**Technical Details**:

- `useContext(FlatwaveLanguageContext)` requires importing the context
- A hook `useFlatwaveLanguage()` can provide both the locale and a setter (`setLocale` for programmatic switching)
- Similar patterns exist in `react-helmet-async` (`useLocation`) and router libraries

**Options**:

1. **Export `useFlatwaveLanguage()` hook** — Returns `{ locale: string; supportedLanguages: string[]; defaultLanguage: string }`.
2. **Export only the context, let consumers make their own hook** — Maximum flexibility, minimal API surface.
3. **Export both hook and context** — Hook for ergonomics, context for advanced use (e.g., `FlatwaveLanguageSelector` can use context directly).

**Recommended**: Option 1 — The hook is a thin wrapper around `useContext(FlatwaveLanguageContext)` but provides better DX. Implementation is ~5 lines.

**DECISION: Option 1 selected** — Export `useFlatwaveLanguage()` hook.

---

### Q6: Should `FlatwaveLanguageDetector` have built-in i18n initialization waiting?

**Problem**: The working project's `LanguageDetector` waits for i18n to be initialized (`isI18nReady` check) before rendering children. This is specific to `i18next`. The generic plugin should not block on i18n library initialization.

**Technical Details**:

- `i18next.isInitialized` and `i18n.changeLanguage` are i18n-library specific
- The plugin's `FlatwaveLanguageDetector` is i18n-agnostic
- Consumers may use different i18n libraries or none at all

**Options**:

1. **Remove i18n waiting logic entirely** — Always render children immediately. Consumers who need i18n waiting can wrap `FlatwaveLanguageDetector` with their own logic.
2. **Add `onReady?: () => void` callback** — Let consumers signal when their resources are ready.
3. **Add `ready?: boolean` prop** — Consumer controls readiness. Default `true`.

**Recommended**: Option 1 — Keeps the component library agnostic. The working project can create its own `FlatwaveLanguageDetector` wrapper that waits for i18n initialization.

**DECISION: Option 1 selected** — No built-in i18n initialization waiting; consumers handle this via wrapping.

---

### Q7: Should we add TypeScript utility types for common frontmatter extensions?

**Problem**: Consumers commonly add custom frontmatter fields (e.g., `audioUrl`, `videoId`, `author`). Providing typed helpers would reduce boilerplate.

**Technical Details**:

- `FlatwaveFrontmatter` has required fields: `title`, `slug`, `id`, `component`, `public`
- Consumers may want `FlatwaveFrontmatter & { myField: string }`
- Generic type parameter is already supported but could have presets

**Options**:

1. **Provide no presets** — Consumers use generics directly: `FlatwaveMDComponentProps<MyFrontmatter>`
2. **Export `FlatwaveFrontmatterStrict` with all optional fields** — Better for extension, but requires consumers to explicitly set required fields
3. **Export intersection helper type** — `FlatwaveFrontmatterWith<T>` type for easy extension

**Recommended**: Option 3 — A helper type like `FlatwaveFrontmatterWith<T>` is low-cost and improves ergonomics for the common extension pattern.

**DECISION: Option 3 selected** — Export `FlatwaveFrontmatterWith<T>` utility type: `type FlatwaveFrontmatterWith<T> = FlatwaveFrontmatter & T;`
