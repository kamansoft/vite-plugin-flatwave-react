## 1. Types and Interfaces

- [x] 1.1 Add `emitFiles` optional callback to `RenderHooks` interface in `src/types.ts`
- [x] 1.2 Define and export `EmitFilesContext` interface in `src/types.ts` (fields: `routes`, `contentIndex`, `renderedFiles`)
- [x] 1.3 Export `SsgOutputFile` type from `src/types.ts` (move from `runSsg.ts` or re-export)
- [x] 1.4 Define and export `FlatwaveMDComponentProps<TFrontmatter>` generic interface in `src/react/types.ts`
- [x] 1.5 Define and export `FlatwaveMDPageProps<TFrontmatter>` generic interface in `src/react/types.ts`
- [x] 1.6 Define and export `FlatwaveLanguageRouterProps`, `FlatwaveLanguageDetectorProps`, and `FlatwaveAppRoutesProps` interfaces in `src/react/types.ts`
- [x] 1.7 Define and export `FlatwaveLanguageContextValue` interface and `FlatwaveLanguageContext` React context in `src/react/FlatwaveLanguageContext.ts`
- [x] 1.8 Export `FlatwaveFrontmatterWith<T>` utility type for frontmatter extension

## 2. FlatwaveMDComponent

- [x] 2.1 Create `src/react/FlatwaveMDComponent.tsx` — implement the generic functional component
- [x] 2.2 Implement `markdownHtml` prop rendering via `dangerouslySetInnerHTML`
- [x] 2.3 Implement `markdown` prop rendering via `react-markdown` for raw client-side use
- [x] 2.4 Implement priority logic: `markdownHtml` takes precedence over `markdown` when both are provided
- [x] 2.5 Implement `children` render prop: `children?: (rendered: React.ReactNode, frontmatter: TFrontmatter) => React.ReactNode`
- [x] 2.6 Strip YAML frontmatter from `markdown` prop before rendering (defensive: remove `---\n...\n---` block)
- [x] 2.7 Provide `FlatwaveLanguageContext.Provider` to expose `locale` to descendants
- [x] 2.8 Apply `className` and `style` props to the outermost element

## 3. FlatwaveMDPageComponent

- [x] 3.1 Create `src/react/FlatwaveMDPageComponent.tsx` — implement the generic functional component
- [x] 3.2 Delegate markdown rendering to `FlatwaveMDComponent` (composition, not reimplementation)
- [x] 3.3 Implement SEO head tags using `react-helmet-async` `<Helmet>`: title, description, canonical, og:title, og:description, og:image, robots
- [x] 3.4 Guard against empty title tag (skip `<title>` if `frontmatter.title` is falsy)
- [x] 3.5 Implement `pageWrapper?: React.ComponentType` prop with default `<main>` element
- [x] 3.6 Implement `loadingFallback?: React.ReactNode` prop for missing content scenarios

## 4. FlatwaveLanguageContext and FlatwaveLanguageDetector

- [x] 4.1 Create `src/react/FlatwaveLanguageContext.ts` — define `FlatwaveLanguageContext` with default value
- [x] 4.2 Create `src/react/FlatwaveLanguageDetector.tsx` — implement renderless language detection component
- [x] 4.3 Implement browser language detection from `navigator.language` / `navigator.languages`
- [x] 4.4 Implement URL-prefix language detection: read first path segment and match against `supportedLanguages`
- [x] 4.5 Implement redirect logic: when no language prefix in URL, redirect to `/{detectedLang}{currentPath}` using react-router `useNavigate` with `replace: true`
- [x] 4.6 Implement `onLanguageChange` callback — call only when language changes
- [x] 4.7 Provide `FlatwaveLanguageContext.Provider` with current locale state
- [x] 4.8 Render children after language is resolved (no indefinite loading state)
- [x] 4.9 Create `src/react/useFlatwaveLanguage.ts` — export `useFlatwaveLanguage()` hook (exported from FlatwaveLanguageContext.ts)

## 5. FlatwaveLanguageRouter

- [x] 5.1 Create `src/react/FlatwaveLanguageRouter.tsx` — implement the convenience router component
- [x] 5.2 Compose `BrowserRouter` + `FlatwaveLanguageDetector` + `FlatwaveAppRoutes` inside `FlatwaveLanguageRouter`

## 6. FlatwaveAppRoutes

- [x] 6.1 Create `src/react/FlatwaveAppRoutes.tsx` — implement the render-prop route mapping component
- [x] 6.2 Implement `routes?: FlatwaveRoute[]` prop with fallback to empty array (caller should provide routes)
- [x] 6.3 Implement `renderPage` prop to render each route
- [x] 6.4 Add catch-all `<Route path="*">` rendering null
- [x] 6.5 Integrate with `FlatwaveLanguageContext` to read active locale

## 7. FlatwaveLanguageSelector

- [x] 7.1 Create `src/react/FlatwaveLanguageSelector.tsx` — implement the language selector UI component
- [x] 7.2 Implement `renderOption?: (lang: string, label: string, isActive: boolean) => React.ReactNode` prop
- [x] 7.3 Implement `onSelect?: (lang: string) => void` callback
- [x] 7.4 Implement `getLabel?: (lang: string) => string` prop for custom language labels
- [x] 7.5 Integrate with `FlatwaveLanguageContext` to read supported languages and current locale
- [x] 7.6 Apply `className` and `style` props to root element

## 8. SSG emitFiles Hook

- [x] 8.1 Add `executeEmitFiles(context: EmitFilesContext): Promise<SsgOutputFile[]>` method to `RenderPipeline.ts`
- [x] 8.2 Store registered `emitFiles` hooks in a private array in `RenderPipeline`
- [x] 8.3 Implement sequential execution with per-hook error isolation in `executeEmitFiles`
- [x] 8.4 Merge return arrays from all hooks into a single flat `SsgOutputFile[]`
- [x] 8.5 Update `RenderPipeline` constructor to register `emitFiles` from `initialHooks`
- [x] 8.6 Update `runSsg.ts` to call `pipeline.executeEmitFiles` after the route render loop
- [x] 8.7 Pass correct `EmitFilesContext` (routes, contentIndex, renderedFiles) in `runSsg.ts`
- [x] 8.8 Append `emitFiles` output to the `outputFiles` array in `runSsg.ts`

## 9. Layout Wrapper Support

- [x] 9.1 Add `layoutWrapper?: React.ComponentType` prop to `FlatwaveLanguageRouter`
- [x] 9.2 Add `layoutWrapper?: React.ComponentType` prop to `FlatwaveAppRoutes`
- [x] 9.3 Update `FlatwaveLanguageRouter` to wrap rendered pages in layoutWrapper

## 10. DefaultRenderStrategy Graceful Degradation

- [x] 10.1 Maintain graceful degradation in `DefaultRenderStrategy.tsx` (returns compiled markdown when no component is found)
- [x] 10.2 Pass `markdownHtml`, `frontmatter`, and `locale` from `RenderContext` correctly
- [x] 10.3 Keep custom component override path (existing behaviour)
- [x] 10.4 Verify existing e2e tests pass after changes

## 11. Package Exports and Peer Dependencies

- [x] 11.1 Update `src/react/index.ts` to export `FlatwaveMDComponent`, `FlatwaveMDPageComponent`, `FlatwaveLanguageRouter`, `FlatwaveLanguageDetector`, `FlatwaveLanguageContext`, `FlatwaveLanguageSelector`
- [x] 11.2 Update `src/index.ts` to re-export from `./react`
- [x] 11.3 Update `src/types.ts` to export `EmitFilesContext` and `SsgOutputFile`
- [x] 11.4 Add `react-markdown` and `react-helmet-async` to `peerDependencies` in `packages/vite-plugin-flatwave-react/package.json`
- [x] 11.5 Add `react-router-dom` to `peerDependencies` (already present)
- [x] 11.6 Run `npm run type-check` to confirm no TypeScript errors

## 12. Example Site Integration

- [x] 12.1 Example site builds successfully with the new components available
- [x] 12.2 Example page components (SimplePage, ProgramPage) work with existing pattern
- [x] 12.3 Run `npm run build:example` and verify all routes generated correctly

## 13. Documentation

- [x] 13.1 Rewrite `README.md` with component-first usage model
- [x] 13.2 Document `FlatwaveMDComponent` props, usage, and extension pattern
- [x] 13.3 Document `FlatwaveMDPageComponent` props, usage, and extension pattern
- [x] 13.4 Document `FlatwaveLanguageRouter` props, `FlatwaveLanguageDetector`, and i18n wiring
- [x] 13.5 Document `FlatwaveLanguageSelector` and `emitFiles` hook with `navigation.json` generation example
- [x] 13.6 Add migration notes section in README
- [ ] 13.7 Update `CHANGELOG.md`
