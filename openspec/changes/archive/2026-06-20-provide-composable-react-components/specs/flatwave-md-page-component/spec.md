## ADDED Requirements

### Requirement: Package exports FlatwaveMDPageComponent

The package SHALL export a React component named `FlatwaveMDPageComponent` from its public surface (`@kamansoft/vite-plugin-flatwave-react`). It SHALL be a generic functional component that extends `FlatwaveMDComponent` by adding full-page concerns: SEO head tag management and a page-level wrapper element.

#### Scenario: Named export is available

- **WHEN** a consumer imports `{ FlatwaveMDPageComponent }` from `@kamansoft/vite-plugin-flatwave-react`
- **THEN** the import resolves to a React functional component without runtime error

---

### Requirement: FlatwaveMDPageComponent renders markdown content via FlatwaveMDComponent

`FlatwaveMDPageComponent` SHALL internally delegate markdown rendering to `FlatwaveMDComponent`, accepting the same `markdownHtml`, `markdown`, `frontmatter`, `locale`, `className`, `style`, and `children` props. All behaviour defined in the `markdown-content-component` spec SHALL apply to `FlatwaveMDPageComponent`.

#### Scenario: Pre-compiled HTML is rendered inside the page wrapper

- **WHEN** `markdownHtml="<p>Hello</p>"` is passed to `FlatwaveMDPageComponent`
- **THEN** the rendered output contains `<p>Hello</p>` inside the page wrapper element

#### Scenario: Raw markdown is rendered inside the page wrapper when markdownHtml is absent

- **WHEN** `markdown="# Heading"` is passed without `markdownHtml`
- **THEN** the rendered output contains an `<h1>Heading</h1>` inside the page wrapper element

---

### Requirement: FlatwaveMDPageComponent manages SEO head tags via react-helmet-async

`FlatwaveMDPageComponent` SHALL render SEO head tags using `react-helmet-async`'s `<Helmet>` component (a peer dependency). At minimum, the following tags SHALL be rendered when the corresponding frontmatter field is present:

- `<title>` — from `frontmatter.title`
- `<meta name="description">` — from `frontmatter.description`
- `<link rel="canonical">` — from `frontmatter.canonical`
- `<meta property="og:title">` — from `frontmatter.og?.title` or `frontmatter.title`
- `<meta property="og:description">` — from `frontmatter.og?.description` or `frontmatter.description`
- `<meta property="og:image">` — from `frontmatter.image`
- `<meta name="robots">` — from `frontmatter.robots`

These head tags SHALL only be rendered at runtime (client-side); during SSG the static HTML head is managed by the `renderHtmlHead()` utility in the build pipeline, not by this component.

#### Scenario: Title tag is set from frontmatter

- **WHEN** `frontmatter.title = "About Us"` is passed
- **THEN** the document `<title>` is updated to `"About Us"` after client-side hydration

#### Scenario: Description meta is set from frontmatter

- **WHEN** `frontmatter.description = "Learn about us"` is passed
- **THEN** `<meta name="description" content="Learn about us">` is present in the document head

#### Scenario: No Helmet is rendered when title is absent

- **WHEN** a `frontmatter` object with no `title` field is passed (note: FlatwaveFrontmatter requires title, so this is a type guard scenario for partial/extended use)
- **THEN** no empty `<title>` tag is injected (the component SHALL guard against empty title tags)

---

### Requirement: FlatwaveMDPageComponent accepts a pageWrapper slot prop

`FlatwaveMDPageComponent` SHALL accept a `pageWrapper?: React.ComponentType<{ children: React.ReactNode; frontmatter: TFrontmatter; locale: string }>` prop. When provided, the component SHALL render the content inside this wrapper component. When not provided, the component SHALL render the content inside a `<main>` element.

#### Scenario: Custom page wrapper is used when provided

- **WHEN** `pageWrapper={({ children }) => <section className="page">{children}</section>}` is passed
- **THEN** the rendered output wraps the content in `<section class="page">` instead of `<main>`

#### Scenario: Default main wrapper is used when no pageWrapper is provided

- **WHEN** no `pageWrapper` prop is passed
- **THEN** the rendered output wraps content in a `<main>` element

---

### Requirement: FlatwaveMDPageComponent accepts a loadingFallback prop

`FlatwaveMDPageComponent` SHALL accept a `loadingFallback?: React.ReactNode` prop. This content SHALL be rendered when neither `markdownHtml` nor `markdown` is provided (e.g. during async content loading in client-side navigation).

#### Scenario: Loading fallback is rendered when no content is available

- **WHEN** neither `markdownHtml` nor `markdown` is provided but `loadingFallback={<div>Loading...</div>}` is passed
- **THEN** the component renders the loading fallback content

#### Scenario: No output when loading fallback and content are both absent

- **WHEN** neither `markdownHtml`, `markdown`, nor `loadingFallback` are provided
- **THEN** the component renders null without throwing

---

### Requirement: DefaultRenderStrategy uses FlatwaveMDPageComponent internally

The plugin's `DefaultRenderStrategy` SHALL use `FlatwaveMDPageComponent` to render each route during SSG. It SHALL pass `markdownHtml` (pre-compiled body), `frontmatter`, and `locale` from the `RenderContext`. If no matching component override is found in the `components` map, `FlatwaveMDPageComponent` SHALL be used as the default renderer.

#### Scenario: SSG renders a route using FlatwaveMDPageComponent when no component override exists

- **WHEN** a route's `component` field references a component not found in the components map
- **THEN** `DefaultRenderStrategy` falls back to `FlatwaveMDPageComponent` and produces valid HTML output (not an error string)

#### Scenario: SSG renders a route using a custom component when an override exists

- **WHEN** a route's `component` field resolves to a module in the components map
- **THEN** `DefaultRenderStrategy` uses that component instead of `FlatwaveMDPageComponent`

---

### Requirement: FlatwaveMDPageComponent is composable and extensible

`FlatwaveMDPageProps` interface SHALL be exported. Consumers SHALL be able to create page components that extend `FlatwaveMDPageComponent` by wrapping it or by accepting `FlatwaveMDPageProps` as their props type.

#### Scenario: Consumer creates a branded page component

- **WHEN** a consumer writes `function BrandedPage(props: FlatwaveMDPageProps) { return <FlatwaveMDPageComponent {...props} pageWrapper={BrandedWrapper} /> }`
- **THEN** TypeScript compiles without error and the component renders with the branded wrapper
