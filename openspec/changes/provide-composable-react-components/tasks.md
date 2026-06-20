## 1. Types and Interfaces

- [ ] 1.1 Add `emitFiles` optional callback to `RenderHooks` interface in `src/types.ts`
- [ ] 1.2 Define and export `EmitFilesContext` interface in `src/types.ts` (fields: `routes`, `contentIndex`, `renderedFiles`)
- [ ] 1.3 Export `SsgOutputFile` type from `src/types.ts` (move from `runSsg.ts` or re-export)
- [ ] 1.4 Define and export `FlatwaveMDComponentProps<TFrontmatter>` generic interface in `src/react/types.ts`
- [ ] 1.5 Define and export `FlatwaveMDPageProps<TFrontmatter>` generic interface in `src/react/types.ts`
- [ ] 1.6 Define and export `FlatwaveLanguageRouterProps`, `FlatwaveLanguageDetectorProps`, and `FlatwaveAppRoutesProps` interfaces in `src/react/types.ts`
- [ ] 1.7 Define and export `FlatwaveLanguageContextValue` interface and `FlatwaveLanguageContext` React context in `src/react/FlatwaveLanguageContext.ts`
- [ ] 1.8 Export `FlatwaveFrontmatterWith<T>` utility type for frontmatter extension

## 2. FlatwaveMDComponent

- [ ] 2.1 Create `src/react/FlatwaveMDComponent.tsx` — implement the generic functional component
- [ ] 2.2 Implement `markdownHtml` prop rendering via `dangerouslySetInnerHTML`
- [ ] 2.3 Implement `markdown` prop rendering via `react-markdown` for raw client-side use
- [ ] 2.4 Implement priority logic: `markdownHtml` takes precedence over `markdown` when both are provided
- [ ] 2.5 Implement `children` render prop: `children?: (rendered: React.ReactNode, frontmatter: TFrontmatter) => React.ReactNode`
- [ ] 2.6 Strip YAML frontmatter from `markdown` prop before rendering (defensive: remove `---\n...\n---` block)
- [ ] 2.7 Provide `FlatwaveLanguageContext.Provider` to expose `locale` to descendants
- [ ] 2.8 Apply `className` and `style` props to the outermost element
- [ ] 2.9 Write unit tests for `FlatwaveMDComponent` covering all scenarios in the spec

## 3. FlatwaveMDPageComponent

- [ ] 3.1 Create `src/react/FlatwaveMDPageComponent.tsx` — implement the generic functional component
- [ ] 3.2 Delegate markdown rendering to `FlatwaveMDComponent` (composition, not reimplementation)
- [ ] 3.3 Implement SEO head tags using `react-helmet-async` `<Helmet>`: title, description, canonical, og:title, og:description, og:image, robots
- [ ] 3.4 Guard against empty title tag (skip `<title>` if `frontmatter.title` is falsy)
- [ ] 3.5 Implement `pageWrapper?: React.ComponentType` prop with default `<main>` element
- [ ] 3.6 Implement `loadingFallback?: React.ReactNode` prop for missing content scenarios
- [ ] 3.7 Write unit tests for `FlatwaveMDPageComponent` covering all scenarios in the spec

## 4. FlatwaveLanguageContext and FlatwaveLanguageDetector

- [ ] 4.1 Create `src/react/FlatwaveLanguageContext.ts` — define `FlatwaveLanguageContext` with default value
- [ ] 4.2 Create `src/react/FlatwaveLanguageDetector.tsx` — implement renderless language detection component
- [ ] 4.3 Implement browser language detection from `navigator.language` / `navigator.languages`
- [ ] 4.4 Implement URL-prefix language detection: read first path segment and match against `supportedLanguages`
- [ ] 4.5 Implement redirect logic: when no language prefix in URL, redirect to `/{detectedLang}{currentPath}` using react-router `useNavigate` with `replace: true`
- [ ] 4.6 Implement `onLanguageChange` callback — call only when language changes
- [ ] 4.7 Provide `FlatwaveLanguageContext.Provider` with current locale state
- [ ] 4.8 Render children after language is resolved (no indefinite loading state)
- [ ] 4.9 Create `src/react/useFlatwaveLanguage.ts` — export `useFlatwaveLanguage()` hook
- [ ] 4.10 Write unit tests for `FlatwaveLanguageDetector` covering redirect, callback, and context

## 5. FlatwaveLanguageRouter

- [ ] 5.1 Create `src/react/FlatwaveLanguageRouter.tsx` — implement the convenience router component
- [ ] 5.2 Compose `BrowserRouter` + `FlatwaveLanguageDetector` + `FlatwaveAppRoutes` inside `FlatwaveLanguageRouter`
- [ ] 5.3 Implement `renderPage: (route: FlatwaveRoute, lang: string) => React.ReactNode` prop
- [ ] 5.4 Build `<Routes>` from the active language routes using react-router `<Route>` components
- [ ] 5.5 Ensure `FlatwaveLanguageRouter` has no import from any i18n library — verify with grep in CI
- [ ] 5.6 Write unit tests for `FlatwaveLanguageRouter` covering language redirect and renderPage

## 6. FlatwaveAppRoutes

- [ ] 6.1 Create `src/react/FlatwaveAppRoutes.tsx` — implement the render-prop route mapping component
- [ ] 6.2 Implement `routes?: FlatwaveRoute[]` prop with fallback to `getRoutes(lang)` from virtual module
- [ ] 6.3 Implement `renderPage` prop to render each route
- [ ] 6.4 Add catch-all `<Route path="*">` rendering null
- [ ] 6.5 Integrate with `FlatwaveLanguageContext` to read active locale
- [ ] 6.6 Write unit tests for `FlatwaveAppRoutes` covering route mapping and custom routes

## 7. FlatwaveLanguageSelector

- [ ] 7.1 Create `src/react/FlatwaveLanguageSelector.tsx` — implement the language selector UI component
- [ ] 7.2 Implement `renderOption?: (lang: string, label: string, isActive: boolean) => React.ReactNode` prop
- [ ] 7.3 Implement `onSelect?: (lang: string) => void` callback
- [ ] 7.4 Implement `getLabel?: (lang: string) => string` prop for custom language labels
- [ ] 7.5 Integrate with `FlatwaveLanguageContext` to read supported languages and current locale
- [ ] 7.6 Apply `className` and `style` props to root element
- [ ] 7.7 Write unit tests for `FlatwaveLanguageSelector`

## 8. SSG emitFiles Hook

- [ ] 8.1 Add `executeEmitFiles(context: EmitFilesContext): Promise<SsgOutputFile[]>` method to `RenderPipeline.ts`
- [ ] 8.2 Store registered `emitFiles` hooks in a private array in `RenderPipeline`
- [ ] 8.3 Implement sequential execution with per-hook error isolation in `executeEmitFiles`
- [ ] 8.4 Merge return arrays from all hooks into a single flat `SsgOutputFile[]`
- [ ] 8.5 Update `RenderPipeline` constructor to register `emitFiles` from `initialHooks`
- [ ] 8.6 Update `runSsg.ts` to call `pipeline.executeEmitFiles` after the route render loop
- [ ] 8.7 Pass correct `EmitFilesContext` (routes, contentIndex, renderedFiles) in `runSsg.ts`
- [ ] 8.8 Append `emitFiles` output to the `outputFiles` array in `runSsg.ts`
- [ ] 8.9 Write unit tests for `executeEmitFiles`

## 9. Layout Wrapper Support

- [ ] 9.1 Add `layoutWrapper?: React.ComponentType` prop to `FlatwaveLanguageRouter`
- [ ] 9.2 Add `layoutWrapper?: React.ComponentType` prop to `FlatwaveAppRoutes`
- [ ] 9.3 Update `FlatwaveLanguageRouter` to wrap rendered pages in layoutWrapper
- [ ] 9.4 Write unit tests for layoutWrapper prop functionality

## 10. DefaultRenderStrategy Refactor

- [ ] 10.1 Update `DefaultRenderStrategy.tsx` to use `FlatwaveMDPageComponent` internally
- [ ] 10.2 Pass `markdownHtml`, `frontmatter`, and `locale` from `RenderContext` to `FlatwaveMDPageComponent`
- [ ] 10.3 Keep custom component override path (existing behaviour)
- [ ] 10.4 Remove inline graceful-degradation logic (now in `FlatwaveMDPageComponent`)
- [ ] 10.5 Verify existing e2e tests pass after refactor

## 11. Package Exports and Peer Dependencies

- [ ] 11.1 Update `src/react/index.ts` to export `FlatwaveMDComponent`, `FlatwaveMDPageComponent`, `FlatwaveLanguageRouter`, `FlatwaveLanguageDetector`, `FlatwaveLanguageContext`, `FlatwaveLanguageSelector`
- [ ] 11.2 Update `src/index.ts` to re-export from `./react`
- [ ] 11.3 Update `src/types.ts` to export `EmitFilesContext` and `SsgOutputFile`
- [ ] 11.4 Add `react-markdown` and `react-helmet-async` to `peerDependencies` in `packages/vite-plugin-flatwave-react/package.json`
- [ ] 11.5 Add `react-router-dom` to `peerDependencies` if missing
- [ ] 11.6 Run `npm run type-check` to confirm no TypeScript errors

## 12. Example Site Update

- [ ] 12.1 Update `examples/basic-react-site/` to use `FlatwaveLanguageRouter` from the package
- [ ] 12.2 Create an example page component that extends `FlatwaveMDPageComponent`
- [ ] 12.3 Add an `emitFiles` hook to `examples/basic-react-site/vite.config.ts` generating `navigation.json`
- [ ] 12.4 Add a `NavigationMenu` component that imports and renders `navigation.json` entries
- [ ] 12.5 Run `npm run build:example` and verify `navigation.json` in `dist/`

## 13. Documentation

- [ ] 13.1 Rewrite `README.md` with component-first usage model
- [ ] 13.2 Document `FlatwaveMDComponent` props, usage, and extension pattern
- [ ] 13.3 Document `FlatwaveMDPageComponent` props, usage, and extension pattern
- [ ] 13.4 Document `FlatwaveLanguageRouter` props, `FlatwaveLanguageDetector`, and i18n wiring
- [ ] 13.5 Document `FlatwaveLanguageSelector` and `emitFiles` hook with `navigation.json` generation example
- [ ] 13.6 Add migration notes section in README
- [ ] 13.7 Update `CHANGELOG.md`
