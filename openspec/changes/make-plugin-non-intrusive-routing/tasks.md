## 1. Fix FlatwaveMDPageComponent for server-side rendering

- [ ] 1.1 Update `FlatwaveMDPageComponent.tsx`: change `import { Helmet } from 'react-helmet-async'` to
      `import * as ReactHelmet from 'react-helmet-async'; const { Helmet, HelmetProvider } = ReactHelmet;`
- [ ] 1.2 Confirm `react-markdown` import in `FlatwaveMDComponent.tsx` already uses namespace import
      `import * as ReactMarkdown from 'react-markdown'`; fix if not
- [ ] 1.3 Rebuild plugin: `npm run build:plugin`
- [ ] 1.4 Write a unit test (`DefaultRenderStrategy.test.ts`) that calls `renderToString` with
      `FlatwaveMDPageComponent` and asserts the output contains `<main>`, the markdown body, and `<title>`

## 2. Update DefaultRenderStrategy to use FlatwaveMDPageComponent as only renderer

- [ ] 2.1 Rewrite `DefaultRenderStrategy.tsx`: render path calls
      `renderToString(<HelmetProvider><FlatwaveMDPageComponent frontmatter={...} markdownHtml={...} locale={...} /></HelmetProvider>)`
      using `import * as ReactHelmet from 'react-helmet-async'; const { HelmetProvider } = ReactHelmet;`
- [ ] 2.2 Remove the consumer-component override path entirely — no `componentsDir`, no `buildComponentsMap`
- [ ] 2.3 Remove the raw-markdown fallback (`return compiledBody`) — it MUST NOT appear anywhere
- [ ] 2.4 Ensure error catch blocks still return `<p data-ssg-error>...</p>` for unexpected exceptions

## 3. Remove component from requiredFields entirely

- [ ] 3.1 In `normalizeOptions()` (`src/index.ts`), change default `requiredFields` from
      `['title', 'slug', 'id', 'component', 'public']` to `['title', 'slug', 'id', 'public']`
- [ ] 3.2 Remove `component` from validation entirely — it is not a valid frontmatter field

## 4. Remove componentsDir and buildComponentsMap from runSsg

- [ ] 4.1 In `runSsg.ts`, remove `buildComponentsMap` function entirely
- [ ] 4.2 Remove `componentsDir` from `SsgOptions` type and plugin options
- [ ] 4.3 Pass empty `Map()` to `RenderContext.components` always

## 5. Make routes explicit in FlatwaveLanguageRouter and FlatwaveAppRoutes

- [ ] 5.1 Update `FlatwaveLanguageRouter.tsx`: remove internal call to `getRoutes(lang)`;
      require `routes` to be passed via prop; update `FlatwaveLanguageRouterProps` type
- [ ] 5.2 Update `FlatwaveAppRoutes.tsx`: change `routes?: FlatwaveRoute[]` to
      `routes: FlatwaveRoute[]` (required); remove fallback `getRoutes(locale)` call
- [ ] 5.3 Update `FlatwaveAppRoutesProps` and `FlatwaveLanguageRouterProps` in `src/react/types.ts`
- [ ] 5.4 Run `npm run type-check` — fix any resulting TypeScript errors

## 6. Update example site to composable pattern

- [ ] 6.1 Remove `componentsDir` from `examples/basic-react-site/vite.config.ts`
- [ ] 6.2 Remove `component: 'SimplePage'` / `component: 'ProgramPage'` from all example Markdown
      frontmatter files
- [ ] 6.3 Rewrite `examples/basic-react-site/src/App.tsx` to use `FlatwaveLanguageRouter` +
      `FlatwaveMDPageComponent` (with `useFlatwaveRoutes` providing explicit routes)
- [ ] 6.4 Remove `SimplePage.tsx` and `ProgramPage.tsx` — they are no longer used
- [ ] 6.5 Run `npm run build:example` and verify all HTML files are generated correctly with no
      `data-ssg-error` elements

## 7. Validation and CI

- [ ] 7.1 Run `npm run validate` (format + lint + type-check + build + test) — all must pass
- [ ] 7.2 Verify `e2e/example.test.ts` passes: routes exist, titles match frontmatter, sitemap correct
- [ ] 7.3 Verify no `<p data-ssg-error>` appears in any generated HTML file in `examples/basic-react-site/dist/`

## 8. Update README

| [ ] 8.1 Update "How It Works" section: route generation is driven by content + composable components
| [ ] 8.2 Remove `componentsDir` from the primary `vite.config.ts` example
| [ ] 8.3 Remove `component: 'SimplePage'` from the primary frontmatter example
| [ ] 8.4 Add "Automatic Route Generation" section showing `FlatwaveLanguageRouter` → SSG HTML flow
| [ ] 8.5 Update "Build Outputs" section to clarify these come from the composable components
|
