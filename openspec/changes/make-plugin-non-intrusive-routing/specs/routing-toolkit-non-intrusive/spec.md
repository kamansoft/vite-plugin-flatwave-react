# routing-toolkit-non-intrusive Specification

## Purpose

Defines the contract for `@kamansoft/vite-plugin-flatwave-react` as a composable routing and rendering
toolkit. The plugin provides automatic route generation as a first-class feature: `vite build` emits
locale-prefixed static HTML, a sitemap, and robots.txt — driven entirely by the consumer's content files
and the Flatwave composable React components. No intrusive component-by-name loading is required.

---

## Requirements

### Requirement: SSG generates routes through FlatwaveMDPageComponent, not component-name loading

The SSG pipeline (`DefaultRenderStrategy`) SHALL use `FlatwaveMDPageComponent` as its **only renderer**
for every content route. It SHALL NOT require a `component` frontmatter field or a `componentsDir`
configuration to produce valid, SEO-compatible HTML output.

The `componentsDir` config option and the `component` frontmatter field are **removed entirely**.

#### Scenario: Route HTML generated without componentsDir or component field

- **WHEN** `vite.config.ts` configures `flatwaveContent()` with no `componentsDir` property
- **AND** the Markdown frontmatter contains no `component` field
- **THEN** `vite build` emits a valid `{locale}/{slug}/index.html` for every public route, with the
  Markdown body rendered as HTML inside a `<main>` element and the page title set from frontmatter

#### Scenario: Route HTML includes frontmatter-driven SEO metadata

- **WHEN** a Markdown file has `title: 'About Us'`, `description: '...'`, and `canonical: '/es/about'`
- **THEN** the generated HTML contains `<title>About Us</title>`, `<meta name="description" ...>`,
  and `<link rel="canonical" ...>` in the `<head>` section

---

### Requirement: component frontmatter field is removed entirely

The `component` field SHALL be removed from `requiredFields` entirely.
`requiredFields` SHALL default to `['title', 'slug', 'id', 'public']`.
The `component` field is no longer a valid frontmatter field — it is ignored if present in Markdown files.

#### Scenario: Build succeeds without component in frontmatter

- **WHEN** all Markdown files omit the `component` frontmatter field
- **THEN** `vite build` completes without validation errors or warnings about missing `component`

#### Scenario: component field in frontmatter is ignored

- **WHEN** a Markdown file contains a `component` frontmatter field
- **THEN** the field is ignored during validation and route generation; no error or warning is emitted

---

### Requirement: FlatwaveLanguageRouter is the composable entry point for application routing

A consumer SHALL be able to build a complete multilingual static site by using `FlatwaveLanguageRouter`
in their `App.tsx`. The consumer provides a `renderPage` render prop that returns a
`FlatwaveMDPageComponent` for each route. **The SSG generates static HTML for each route by processing
those same components** — meaning the client-side SPA and the pre-rendered HTML are coherent.

#### Scenario: Consumer App uses composable pattern

- **WHEN** `App.tsx` renders:
  ```tsx
  <FlatwaveLanguageRouter
    supportedLanguages={['es', 'pt']}
    defaultLanguage="es"
    renderPage={(route, locale) => (
      <FlatwaveMDPageComponent
        frontmatter={route.frontmatter}
        markdownHtml={getContent(route.contentId, locale)?.body}
        locale={locale}
      />
    )}
  />
  ```
- **THEN** the app renders the correct page for any valid `/{locale}/{slug}` URL on the client

#### Scenario: SSG produces matching HTML for every client-side route

- **WHEN** the consumer's `App.tsx` uses `FlatwaveLanguageRouter` + `FlatwaveMDPageComponent`
- **AND** `vite build` runs
- **THEN** each route URL that `FlatwaveLanguageRouter` would serve has a corresponding
  `dist/{locale}/{slug}/index.html` with the same content the SPA would render

---

### Requirement: SSG always generates locale-prefixed routes, sitemap, and robots

The SSG pipeline SHALL always generate:

- `{locale}/{slug}/index.html` for every public content route
- `sitemap.xml` listing all public route URLs (configurable hostname)
- `robots.txt` pointing to the sitemap
- `route-manifest.json` listing all generated routes with metadata

These outputs are automatic — the consumer does not need to configure them to get them.

#### Scenario: All public routes produce HTML files

- **WHEN** the content directory contains 3 public Markdown files per locale (6 total for 2 locales)
- **THEN** `vite build` emits 6 locale-prefixed HTML files in `dist/`

#### Scenario: sitemap contains all public routes

- **WHEN** `sitemap.hostname` is set to `'https://mysite.com'`
- **THEN** `dist/sitemap.xml` contains one `<loc>` element per public route, e.g.
  `<loc>https://mysite.com/es/about</loc>`

---

### Requirement: FlatwaveMDPageComponent is server-render compatible

`FlatwaveMDPageComponent` SHALL work correctly inside `react-dom/server`'s `renderToString`.
`react-helmet-async` and `react-markdown` SHALL be imported using namespace imports
(`import * as Pkg from 'pkg'`) to resolve CJS/ESM interoperability in the Node SSG environment.

#### Scenario: renderToString produces valid HTML with head tags

- **WHEN** `DefaultRenderStrategy` calls `renderToString(<HelmetProvider><FlatwaveMDPageComponent ... /></HelmetProvider>)`
- **THEN** the result is a valid HTML string containing `<main>` with the Markdown body and the
  `<title>` / `<meta>` tags from the frontmatter

#### Scenario: No runtime error when markdownHtml is provided

- **WHEN** `markdownHtml` is a non-empty compiled HTML string
- **THEN** `FlatwaveMDPageComponent` renders the HTML via `dangerouslySetInnerHTML` without attempting
  to load or execute `react-markdown`

---

### Requirement: Strategy pattern for build process extensibility

The plugin SHALL provide a strategy pattern that allows users to define custom logic to create additional files
(e.g., JSON files) from the recursive markdown content loop during the build process.

#### Scenario: User defines custom strategy to generate JSON from markdown content

- **WHEN** the user provides a strategy function that processes markdown content during build
- **AND** the strategy is configured in the plugin options
- **THEN** the strategy function is called for each markdown file during the SSG rendering loop
- **AND** the user can create additional output files (e.g., JSON) based on the markdown content

#### Scenario: Strategy receives markdown metadata and content

- **WHEN** the strategy function is invoked during build
- **THEN** it receives the frontmatter, slug, locale, and compiled HTML for each markdown file
- **AND** the user can access all content data to generate custom output files
