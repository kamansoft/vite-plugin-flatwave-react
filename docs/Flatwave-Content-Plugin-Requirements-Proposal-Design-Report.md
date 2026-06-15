# Vite Plugin for Markdown-Driven, i18n-Aware Static React Sites

## 1. Executive Summary

This report defines the research plan, requirements, proposal, and design for a distributable NPM package that enables Vite + React projects to build static sites from Markdown files with frontmatter, localized content, browser-language-aware routing, and SEO-friendly static output.

The current Radionudista example proves the core idea: Markdown files in `src/content/{lang}/` are indexed at build time, frontmatter controls routing and component selection, `i18next` handles browser-language detection, and Vite plugins generate localized HTML shells. The next step is to extract those concepts into a reusable plugin package with clean public APIs, typed content contracts, virtual modules, SSG integration, SEO metadata generation, HMR, and a simple example Vite app for development and testing.

No implementation work is proposed in this document. This is a planning and requirements artifact only.

---

## 2. Research Plan

### 2.1 Research Sources to Review

1. **Existing architecture research**
   - `docs/Vite-Plugin-Architecture-for-Markdown-Driven-i18n-Aware-Static-Content-Builders.md`
   - Existing Radionudista documentation under `current-working-project-with-features/docs/`

2. **Current working example**
   - `current-working-project-with-features/src/plugins/contentJsonGenerator.ts`
   - `current-working-project-with-features/src/plugins/multiLanguageBuild.ts`
   - `current-working-project-with-features/src/components/LanguageRouter.tsx`
   - `current-working-project-with-features/src/config/i18n.ts`
   - `current-working-project-with-features/src/lib/contentLoader.ts`
   - `current-working-project-with-features/scripts/validate-frontmatter.js`

3. **Vite plugin architecture**
   - Vite Plugin API: factory plugins, `resolveId`, `load`, `transform`, `configureServer`, `handleHotUpdate`, `transformIndexHtml`, `generateBundle`, virtual modules, plugin ordering, dev/build mode differences.
   - Best practice: use `virtual:` for public virtual module names and `\0` internally.

4. **Markdown and React rendering**
   - `gray-matter` for frontmatter parsing.
   - `react-markdown` for runtime Markdown rendering.
   - No MDX support in v1; Markdown must be valid GitHub-flavored Markdown.

5. **i18n and SEO**
   - URL-prefixed locale routes are required for SEO.
   - Browser language detection should redirect or select a locale only as progressive enhancement.
   - Avoid rendering different language content for the same URL.

6. **SSG and pre-rendering**
   - Compare Vike, `vite-react-ssg`, and custom Vite SSG scripts.
   - Select a default adapter that can consume the plugin route inventory and render every locale-prefixed route to static HTML.
   - Plugin should expose route inventories and localized metadata without owning the full rendering framework.

7. **NPM package distribution**
   - TypeScript source.
   - ESM-first package.
   - Proper `exports`, `types`, `files`, `peerDependencies`, and `devDependencies`.
   - Example app using a local workspace/file dependency for development.

---

## 3. Current Radionudista Feature Inventory

### 3.1 Content Model

Current content files live in:

```text
src/content/{lang}/{slug}.md
```

Observed current content:

- Languages: `es`, `pt`
- Total Markdown files: 20
- Unique content IDs: 10
- Components referenced by frontmatter:
  - `ProgramPage`: 16 files
  - `SimplePage`: 4 files
- Required/frontmatter fields currently used:
  - `language`
  - `title`
  - `slug`
  - `id`
  - `component`
  - `public`
  - `date`
  - `program_order`
  - `schedule`
  - `talent`
  - `social`
  - `logo`
  - `audio_source`
  - `menu`
  - `menu_position`

Reference: `current-working-project-with-features/src/content/es/misterios.md:1`.

### 3.2 Build-Time Content Indexing

The current `contentJsonGeneratorPlugin` scans Markdown files, parses frontmatter with `gray-matter`, validates fields, and writes `src/contentIndex.json`. It is configured in `vite.config.ts`.

Key current behavior:

- Scans `contentDir` recursively.
- Parses frontmatter with `gray-matter`.
- Validates required fields and component existence.
- Warns when a content ID is missing in a supported language.
- Embeds Markdown body as `content` in the generated JSON.
- Writes `src/contentIndex.json`.
- A separate inline plugin copies it to `public/contentIndex.json`.

References:

- `current-working-project-with-features/src/plugins/contentJsonGenerator.ts:48`
- `current-working-project-with-features/vite.config.ts:33`
- `current-working-project-with-features/vite.config.ts:39`

### 3.3 Runtime Content Loading

`src/lib/contentLoader.ts` imports all raw Markdown files with `import.meta.glob` and merges them with `contentIndex.json`.

Current behavior:

- `import.meta.glob('../content/*/*.md', { query: '?raw', import: 'default', eager: true })`
- Builds `lang -> slug -> content` map.
- Exposes `getContent(lang, slug)` and `getAllSlugs(lang)`.
- `reloadContent()` fetches `/contentIndex.json` in development.

References:

- `current-working-project-with-features/src/lib/contentLoader.ts:12`
- `current-working-project-with-features/src/lib/contentLoader.ts:59`

Important gap: the raw Markdown body is loaded twice: once embedded in `contentIndex.json` and again through `import.meta.glob`. A reusable plugin should make the plugin-generated module the single source of truth.

### 3.4 i18n and Browser Language Detection

Current i18n stack:

- `i18next`
- `i18next-browser-languagedetector`
- `react-i18next`
- `src/lang/{lang}.json` translation files

Current detection order:

```ts
['path', 'localStorage', 'navigator', 'htmlTag']
```

Reference: `current-working-project-with-features/src/config/i18n.ts:38`.

Current routing behavior:

- `/` redirects to detected language.
- `/{lang}` routes are generated for each supported language.
- Dynamic content pages render under `/{lang}/:slug`.

References:

- `current-working-project-with-features/src/components/LanguageRouter.tsx:97`
- `current-working-project-with-features/src/components/LanguageRouter.tsx:138`

Important gap: language detection is useful for UX, but SEO must rely on static locale-prefixed URLs, not runtime detection alone.

### 3.5 Multilingual Static HTML Shell

Current `multiLanguageBuild` plugin generates per-language `index.html` assets during build:

- Default language at `/index.html`
- Other languages at `/{lang}/index.html`
- Adds `<html lang="{language}">`
- Adds `<base href="{basePath}/">`
- Sets `window.__INITIAL_LANGUAGE__`

Reference: `current-working-project-with-features/src/plugins/multiLanguageBuild.ts:62`.

Important gap: this currently creates language-specific HTML shells but not fully pre-rendered localized page HTML. It is a good foundation for locale-prefixed static hosting, but not sufficient by itself for SEO-heavy content pages.

### 3.6 SEO and Metadata

Current SEO behavior:

- `index.html` has title, description, Open Graph, Twitter tags.
- `SimplePage` uses `react-helmet-async` for `<title>` and description from frontmatter.
- `multiLanguageBuild` sets `<html lang>`.

References:

- `current-working-project-with-features/index.html:19`
- `current-working-project-with-features/src/pages/SimplePage.tsx:23`
- `current-working-project-with-features/src/plugins/multiLanguageBuild.ts:80`

Gaps:

- No sitemap generation.
- No canonical URL generation.
- No `hreflang` alternates.
- No JSON-LD.
- No `robots` metadata.
- `ProgramPage` does not set page-specific meta tags.
- The generated HTML title is hardcoded as `RadioNudista`.

### 3.7 Validation

There are currently two validation layers:

1. `npm run validate:frontmatter`, which runs `scripts/validate-frontmatter.js`
2. Vite plugin validation in `contentJsonGeneratorPlugin`

They overlap but are not identical.

References:

- `current-working-project-with-features/package.json:8`
- `current-working-project-with-features/scripts/validate-frontmatter.js:31`
- `current-working-project-with-features/src/plugins/contentJsonGenerator.ts:83`

Important gap: a reusable plugin should provide one canonical validation system with configurable strictness.

---

## 4. Research Findings and Best Practices

### 4.1 Vite Plugin Architecture

Recommended plugin shape:

```ts
export default function flatwaveContent(options: FlatwaveContentOptions): Plugin[] {
  return [corePlugin(options), runtimePlugin(options)];
}
```

Best practices:

- Use a factory function with typed options.
- Use `name` namespaced to avoid collisions, e.g. `flatwave-react:content`.
- Use `virtual:` for public imports.
- Use `\0` internally for virtual module IDs.
- Use `resolveId` + `load` for virtual modules.
- Use `transform` or `load` for `.md` files.
- Use `this.addWatchFile()` for content dependencies.
- Use `handleHotUpdate` to invalidate virtual modules in dev.
- Use `transformIndexHtml` for global SEO tags.
- Use `generateBundle` for static assets such as sitemap or route manifests.
- Use `apply` or `enforce` only when necessary.

References:

- Vite Plugin API official docs.
- Existing docs: `docs/Vite-Plugin-Architecture-for-Markdown-Driven-i18n-Aware-Static-Content-Builders.md:45`.

### 4.2 Markdown and Frontmatter

Recommended behavior:
- Parse Markdown with `gray-matter`.
- Separate metadata from body.
- Keep raw Markdown body available.
- Optionally compile Markdown to React at render time using `react-markdown`.
- Avoid compiling Markdown directly in the core plugin unless explicitly requested.
- Do not support MDX in v1; accept only Markdown syntax that GitHub renders for `.md` files.

Recommended import shape:

```ts
import content from './about.md';

content.body;
content.attributes;
content.frontmatter;
```

Recommended virtual module shape:

```ts
import { getContent, getRoutes, getAlternatives } from 'virtual:flatwave/content';
```

### 4.3 i18n Strategy

Recommended locale strategy:
- Use URL prefixes for every locale, including the default locale: `/{locale}/...`.
- The default locale route is `/es/...` when `defaultLocale: 'es'`; do not generate an unprefixed default route in v1.
- Keep every locale URL static and crawlable.
- Use browser language detection only for redirecting `/` or choosing the default locale.
- Recommended detection priority:
  1. URL path
  2. Cookie
  3. localStorage
  4. `navigator.language`
  5. default locale
- Never rely on `navigator.language` to change content for the same URL.

### 4.4 SSG Strategy

Recommended SSG boundary:
- The plugin generates a route inventory:
  - route path
  - locale
  - content ID
  - component
  - metadata
  - alternates
- The SSG adapter renders pages.
- The plugin should expose route metadata and localized HTML/head data without owning the full rendering framework.
- The v1 default adapter is Vike and should be documented as the supported path for the example app.

Research summary:
- **Vike** is the current name for `vite-plugin-ssr` and provides a mature Vite-native SSR/SSG model, route configuration, prerendering, head metadata support, and i18n documentation. It is more framework-like than a small plugin, but it directly solves static pre-rendering for Vite apps.
- **`vite-react-ssg` / `vite-plugin-react-ssg`** is React-specific and works well with React Router v6 route trees, `getStaticPaths`, build-time loaders, document head management, critical CSS, and custom route inclusion hooks. Its README notes that React Router v7 has built-in SSG support and recommends using that official capability for React Router v7 users.
- **Custom Vite SSG** uses Vite's documented SSR APIs, including `ssrLoadModule`, `renderToString`, and static HTML writing. It gives maximum control over localized rendering, metadata injection, sitemap generation, and output shape, but it requires maintaining a small framework inside the plugin or example app.
- Vite's official SSR guide describes pre-rendering as a form of SSG when routes and data are known ahead of time, and the static deploy guide confirms that Vite builds can output static files for static hosts.

Comparison matrix:

| Option | Best fit | Strengths | Weaknesses | Fit for this plugin |
| --- | --- | --- | --- | --- |
| Vike | Full Vite-native SSR/SSG with routing and prerendering | Mature Vite integration; built-in prerendering; routing and head metadata support; i18n guidance; static output for deployable HTML | More framework-like; app may need to adopt Vike route conventions; can constrain the example app architecture | Strong default if the project is willing to adopt Vike conventions for the example app |
| `vite-react-ssg` | React Router v6 apps that already define routes in code | React-focused; supports `getStaticPaths`, build-time loaders, document head, critical CSS, and route inclusion hooks; simple for route-tree apps | Less aligned with Markdown/file-system route inventory; depends on React Router v6 conventions; React Router v7 users should prefer React Router's own SSG | Good fallback for React Router v6, but not the best primary adapter for a Markdown-driven content inventory |
| Custom Vite SSG | Maximum control over Markdown/i18n/SEO output | Can consume the plugin's route inventory directly; can write exact locale-prefixed HTML files, localized metadata, sitemap, and robots output; avoids imposing a routing framework | Highest maintenance burden; must handle SSR setup, hydration scripts, asset injection, concurrency, and edge cases | Best technical fit for the plugin boundary, but should be an advanced or internal adapter rather than the first public default |

Recommended default:
- Use **Vike** as the documented default SSG adapter for v1 because it is the most mature Vite-native SSR/SSG option, has explicit prerendering and i18n guidance, and can render every locale-prefixed route as static HTML.
- Keep the plugin's route inventory adapter-neutral so a future React Router v6 `vite-react-ssg` adapter or custom Vite SSG adapter can be added without changing the core content model.
- Treat custom Vite SSG as an advanced integration path for teams that need exact control over output shape, metadata injection, or non-Vike routing conventions.

Default adapter responsibilities:
1. Import the plugin route inventory.
2. Render each route with the correct locale and content variant.
3. Inject localized `<title>`, `<meta>`, canonical, `hreflang`, Open Graph, Twitter, JSON-LD, and `<html lang>` values.
4. Write static HTML files under the locale-prefixed route paths.
5. Generate sitemap and `robots.txt` from the same route inventory.

### 4.5 SEO Requirements

For SEO compatibility, every locale page must have:

- Static HTML output.
- Localized `<title>`.
- Localized `<meta name="description">`.
- `<html lang="{locale}">`.
- Canonical URL.
- `hreflang` alternates.
- Open Graph tags.
- Twitter Card tags.
- Optional JSON-LD.
- Sitemap generation by default.
- `robots.txt` generation by default.

### 4.6 NPM Package Strategy

Recommended package structure:

```text
packages/
  vite-plugin-flatwave-react/
    src/
    test/
    package.json
examples/
  basic-react-site/
docs/
```

Recommended package metadata:

- `type: module`
- `exports` with `types`, `import`, and optionally `require`
- `types` field
- `peerDependencies`:
  - `vite`
  - `react` and `react-dom` because v1 is React-specific
- `dependencies` only for required runtime/build utilities, e.g. `gray-matter`, `fast-glob`
- `devDependencies`:
  - `typescript`
  - `vitest`
  - `vite`
  - `@types/node`
  - `tsup` or `rolldown`/Vite lib build
  - `prettier`, `eslint` optional

Recommended public API:

```ts
import { flatwaveContent } from 'vite-plugin-flatwave-react';

export default defineConfig({
  plugins: [
    react(),
    flatwaveContent({
      contentDir: 'src/content',
      locales: ['es', 'pt'],
      defaultLocale: 'es',
      fallback: 'default',
      strictMissingLocales: false, // warn by default; strict mode can fail CI
      seo: true,
      ssg: true,
    }),
  ],
});
```

---

## 5. Proposed Plugin Requirements

### 5.1 Must-Have Requirements

1. **Markdown discovery**
   - The plugin MUST scan configured Markdown files.
   - It MUST support locale directories such as `src/content/{locale}/`.
   - It SHOULD also support filename locale patterns such as `about.en.md`.
   - It MUST NOT support MDX in v1.

2. **Frontmatter parsing**
   - The plugin MUST parse YAML frontmatter.
   - It MUST expose `attributes`, `body`, and normalized metadata.

3. **Localized content indexing**
   - The plugin MUST group content by `id` and `locale`.
   - It MUST expose a route inventory containing all `(locale, route, contentId)` combinations.

4. **Virtual modules**
   - The plugin MUST expose a virtual module for content lookup.
   - The plugin SHOULD expose a virtual module for route inventory.
   - Suggested imports:
     - `virtual:flatwave/content`
     - `virtual:flatwave/routes`

5. **Direct Markdown imports**
   - The plugin MUST allow importing `.md` files as structured content.
   - Suggested default export shape:
     - `{ body, attributes, frontmatter }`

6. **Validation**
   - The plugin MUST validate required frontmatter fields.
   - It MUST validate duplicate IDs, slugs, and menu positions.
   - It MUST warn by default when a locale variant is missing.
   - It MUST allow strict mode to fail the build or CI when missing locales are not acceptable.
   - The plugin SHOULD expose a standalone validation CLI that uses the same rules as the Vite plugin.

7. **i18n routing**
   - The plugin MUST support locale-prefixed routes for every locale.
   - It MUST keep the default locale prefixed, for example `/es/...` when `defaultLocale: 'es'`.
   - It MUST expose a default locale policy.
   - It MUST provide fallback behavior when a locale variant is missing.

8. **Browser language detection**
   - The plugin MAY provide a small client helper for browser language detection.
   - Browser detection MUST only redirect or select a locale; it MUST NOT replace static locale URLs.

9. **SSG integration**
   - The plugin MUST expose route metadata consumable by an SSG adapter.
   - It MUST provide a documented default SSG adapter path using Vike.
   - It SHOULD provide adapter types so future adapters can consume the same route inventory.

10. **SEO metadata**
    - The plugin MUST support frontmatter fields for title, description, canonical, image, robots, JSON-LD, Open Graph, and Twitter Card metadata.
    - It MUST generate localized SEO metadata.
    - It MUST generate `hreflang` alternates.
    - It MUST generate sitemap and `robots.txt` by default.

11. **HMR**
    - The plugin MUST update content and virtual modules during Vite dev server changes.

12. **TypeScript support**
    - The plugin MUST ship types.
    - The plugin SHOULD generate or provide content type helpers.

13. **Example app**
    - The repository SHOULD include a simple Vite + React + TypeScript example app for plugin development and testing.

### 5.2 Should-Have Requirements

- Optional React Markdown renderer component.
- Optional content schema validation with Zod or JSON Schema.
- Optional content caching for large sites.
- Optional per-locale bundle splitting.

### 5.3 Non-Goals

- Building a full CMS.
- Replacing `i18next`, `react-i18next`, or any i18n library.
- Rendering different languages from the same URL.
- Supporting MDX in v1.
- Supporting server-side dynamic localization as the primary SEO strategy.
- Implementing application-specific radio, Twitch, or streaming features.

---

## 6. Proposed Architecture

### 6.1 Package Modules

Recommended package modules:

```text
src/
  index.ts
  plugin.ts
  types.ts
  content/
    scanner.ts
    parser.ts
    validator.ts
    routeBuilder.ts
  virtual/
    modules.ts
  seo/
    metadata.ts
    sitemap.ts
  react/
    contentHook.ts
    MarkdownRenderer.tsx
  ssg/
    types.ts
```

### 6.2 Data Model

Recommended normalized model:

```ts
interface FlatwaveContentEntry {
  id: string;
  locale: string;
  slug: string;
  path: string;
  component?: string;
  public: boolean;
  attributes: Record<string, unknown>;
  body: string;
  route: string;
  alternatives: Record<string, string>;
}

interface FlatwaveRoute {
  locale: string;
  path: string;
  contentId: string;
  component?: string;
  metadata: SeoMetadata;
}

interface FlatwaveContentIndex {
  byId: Record<string, Record<string, FlatwaveContentEntry>>;
  byLocale: Record<string, Record<string, FlatwaveContentEntry>>;
  routes: FlatwaveRoute[];
}
```

### 6.3 Virtual Module API

Recommended runtime API:

```ts
import {
  getContent,
  getAllContent,
  getRoutes,
  getAlternatives,
  getLocale,
} from 'virtual:flatwave/content';
```

Recommended exports:

- `getContent(id, locale?)`
- `getContentBySlug(locale, slug)`
- `getRoutes(locale?)`
- `getAlternatives(id, currentLocale)`
- `getLocales()`
- `getDefaultLocale()`

### 6.4 React Adapter

Recommended React helpers:

```tsx
import { useFlatwaveContent } from 'vite-plugin-flatwave-react/react';
import { MarkdownRenderer } from 'vite-plugin-flatwave-react/react';
```

Recommended behavior:

- `useFlatwaveContent(id, locale?)` reads from the virtual module.
- `MarkdownRenderer` uses `react-markdown`.
- Renderer should allow custom component mapping.
- Core plugin exposes content and route APIs for React consumers.
- React helpers can depend on React and `react-markdown`.
- The content model should stay adapter-friendly, but v1 does not need to support non-React frameworks.

### 6.5 SSG Adapter Boundary

The plugin should expose route metadata like:

```ts
[
  {
    locale: 'es',
    path: '/es/acerca-de-nosotros',
    contentId: 'acerca-de-nosotros',
    component: 'SimplePage',
  },
  {
    locale: 'pt',
    path: '/pt/isto-sobre-nos',
    contentId: 'acerca-de-nosotros',
    component: 'SimplePage',
  }
]
```

The SSG adapter should:

1. Import the route inventory.
2. Render each route with the correct locale.
3. Inject localized metadata.
4. Write static HTML files.
5. Generate sitemap and `robots.txt` from the same route inventory.

Default adapter recommendation:
- Use **Vike** for the documented v1 adapter path because it provides the most complete Vite-native SSR/SSG, prerendering, routing, and i18n support.
- Keep `vite-react-ssg` and custom Vite SSG as secondary integration patterns rather than the default.

### 6.6 SEO Metadata Model

Recommended frontmatter SEO fields:

```yaml
title: "Acerca de Notostros"
description: "Radio social experimental..."
canonical: "/es/acerca-de-nosotros"
image: "/images/og.jpg"
robots: "index, follow"
keywords:
  - radio
  - cultura
jsonLd:
  "@type": "WebPage"
```

Generated tags should include:

- `<title>`
- `<meta name="description">`
- `<link rel="canonical">`
- `<link rel="alternate" hreflang="...">`
- Open Graph tags
- Twitter Card tags
- JSON-LD script
- `<html lang>`

---

## 7. Proposed Example App

A new simple example app should be added for plugin development:

```text
examples/basic-react-site/
  package.json
  vite.config.ts
  index.html
  src/
    main.tsx
    App.tsx
    components/
      SimplePage.tsx
      ProgramPage.tsx
      LanguageSwitcher.tsx
    content/
      es/
        index.md
        about.md
      pt/
        index.md
        about.md
  content/
    es/
      about.md
    pt/
      about.md
```

The example app should demonstrate:

- Vite + React + TypeScript.
- Local package dependency through workspace or `file:` reference.
- Markdown pages with frontmatter.
- Locale-prefixed routes for every locale, including the default locale.
- Browser language detection redirect from `/`.
- Static route inventory.
- React Markdown rendering.
- SEO metadata.
- Sitemap and `robots.txt`.
- Vike-based SSG integration.

### 7.1 Docker Infrastructure and Example Static Site

The first implementation step should create Docker infrastructure and configuration for an example React + Vite static site used to test the plugin in an isolated environment.

Recommended Docker setup:
- `docker-compose.yml` for local development and build verification.
- A dev service that starts the example Vite dev server.
- A build service that runs the static build and writes the output directory.
- A static server service, such as nginx or Caddy, that serves the built site.
- Optional mounted workspace so changes to the plugin and example app can be tested without rebuilding the image.

Recommended Docker files:

```text
docker/
  docker-compose.yml
  dev.Dockerfile
  build.Dockerfile
  static-server.Dockerfile
  nginx.conf
examples/basic-react-site/
  package.json
  vite.config.ts
  index.html
  src/
    main.tsx
    App.tsx
    components/
      SimplePage.tsx
      ProgramPage.tsx
      LanguageSwitcher.tsx
    content/
      es/
        index.md
        about.md
      pt/
        index.md
        about.md
  content/
    es/
      about.md
    pt/
      about.md
```

Docker acceptance checks:
- The dev service can start the example app with the local plugin linked.
- The build service can produce the static output directory.
- The static server serves locale-prefixed HTML routes such as `/es/acerca-de-nosotros`.
- The static output includes generated sitemap and `robots.txt`.
- The same Docker setup can be used in CI to verify plugin behavior before package release.

---

## 8. Validation and Testing Strategy

### 8.1 Unit Tests

Test pure functions:

- Frontmatter parsing.
- Locale extraction.
- Route generation.
- Fallback resolution.
- SEO metadata generation.
- Sitemap generation.
- `robots.txt` generation.
- Validation CLI behavior.
- Missing-locale warning and strict-mode failure behavior.

### 8.2 Plugin Pipeline Tests

Use Vite programmatic APIs:

- `createServer` + `transformRequest`
- `build`
- Virtual module resolution
- `.md` transform/load behavior

### 8.3 Example App Tests

Use the example app for:

- Dev server smoke tests.
- Build output checks.
- Static file existence checks, including localized HTML, sitemap, and `robots.txt`.
- Optional Playwright E2E tests for routing and language detection.

### 8.4 Acceptance Criteria

The plugin planning is complete when:

- Docker infrastructure and example static site are approved.
- Requirements are approved.
- Architecture is approved.
- Example app structure is approved.
- SSG adapter choice is selected.
- No implementation begins until the proposal is approved.

---

## 9. Risks and Trade-Offs

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Vike as default adapter | Can lock the example app into Vike conventions | Keep route inventory generic; document adapter boundary; keep secondary integration patterns |
| Custom SSG maintenance | Correct output shape requires handling SSR, hydration, assets, and concurrency | Treat custom Vite SSG as advanced/internal until needed |
| Markdown HTML safety | Markdown HTML can introduce XSS | Use safe renderer defaults and optional sanitization |
| Large content sets | Slow builds and large bundles | Add caching, per-locale splitting, and route partitioning |
| Runtime language detection | Can harm SEO if used incorrectly | Use only for redirects from `/`, never same-URL content switching |
| Duplicate validation logic | Divergent rules and confusing errors | Make plugin validation canonical and expose the same rules through CLI |
| Bundle size | All locales may be bundled | Support per-locale chunks or dynamic imports |

---

## 10. Resolved Decisions

1. The v1 package is React-specific.
2. The default SSG adapter is Vike, with the route inventory kept adapter-neutral for future adapters.
3. Missing locale variants warn by default; strict mode can fail the build or CI.
4. The default locale is prefixed, for example `/es/...`.
5. MDX is deferred; v1 supports Markdown only.
6. Validation is available as a standalone CLI using the same rules as the Vite plugin.
7. Sitemap and `robots.txt` are generated by default.

---

## 11. Recommended Roadmap

### Phase 0: Docker Infrastructure and Example Static Site

- Add Docker Compose configuration for local plugin testing.
- Add dev, build, and static-server Docker services.
- Add nginx or Caddy static server configuration.
- Add example React + Vite static site used as the Docker test target.
- Verify locale-prefixed routes, sitemap, `robots.txt`, and static build output from containers.

### Phase 1: Core Plugin

- Markdown scanning.
- Frontmatter parsing.
- Content normalization.
- Warning-based validation.
- Strict validation mode.
- Virtual modules.
- HMR.
- Validation CLI.

### Phase 2: i18n and Routing

- Locale detection from file structure.
- Route inventory.
- Fallback policy.
- Browser language helper.
- Language switcher data.
- Prefixed default locale routing.

### Phase 3: React Adapter

- `useFlatwaveContent`.
- `MarkdownRenderer`.
- Component mapping.
- Example app integration.

### Phase 4: SSG Integration

- Route manifest export.
- Vike adapter documentation and example integration.
- Static HTML generation strategy.
- Secondary adapter notes for `vite-react-ssg` and custom Vite SSG.

### Phase 5: SEO

- Metadata generation.
- Canonical URLs.
- `hreflang`.
- Sitemap.
- `robots.txt`.
- Open Graph and Twitter tags.

### Phase 6: Package and Release

- TypeScript build.
- NPM package metadata.
- README.
- Example app.
- CI tests.
- Publish workflow.

---

## 12. Conclusion

The current Radionudista project already demonstrates the core workflow: Markdown content, frontmatter-driven metadata, localized routes, browser language detection, and Vite plugin-based indexing. The reusable plugin should preserve those strengths while removing project-specific assumptions, consolidating validation, exposing typed virtual modules, integrating with SSG, and generating SEO metadata.

The recommended next artifact after approval is an implementation proposal with Docker infrastructure, an example React + Vite static site, Vike as the selected SSG adapter, package scaffold, validation CLI design, and example app plan.
