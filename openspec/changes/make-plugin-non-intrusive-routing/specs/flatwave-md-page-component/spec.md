## MODIFIED Requirements

### Requirement: DefaultRenderStrategy uses FlatwaveMDPageComponent as only renderer

The plugin's `DefaultRenderStrategy` SHALL use `FlatwaveMDPageComponent` as the **only renderer**
for every SSG route. It SHALL pass `markdownHtml` (pre-compiled body), `frontmatter`, and `locale` from
`RenderContext` to the component, wrapping it in `HelmetProvider` for correct SSR head tag extraction.

There is no fallback to consumer-supplied components. The `componentsDir` config option and the
`component` frontmatter field are removed entirely.

#### Scenario: SSG generates route using FlatwaveMDPageComponent

- **WHEN** the SSG pipeline runs for any route
- **THEN** `DefaultRenderStrategy` renders `<HelmetProvider><FlatwaveMDPageComponent ... /></HelmetProvider>`
  via `renderToString` and produces valid HTML with `<main>`, rendered markdown body, and head tags

#### Scenario: No data-ssg-error appears in generated HTML

- **WHEN** the SSG pipeline runs
- **THEN** no `<p data-ssg-error>` element appears in any generated HTML file;
  all pages have the full markdown content rendered

---

## REMOVED Requirements

### Requirement: DefaultRenderStrategy falls back to raw compiled markdown when component not found

**Reason**: Returning a raw compiled markdown string (not wrapped in any element) when no component
is found produces invalid page HTML. `FlatwaveMDPageComponent` is available and correctly wraps the
content in `<main>`, sets head tags, and handles all the concerns of a complete page — it should be
the default, not the fallback.

**Migration**: No consumer action required. The change is internal to `DefaultRenderStrategy`.

### Requirement: DefaultRenderStrategy loads consumer components from componentsDir by name

**Reason**: The component-by-name loading via `componentsDir` and `component` frontmatter field is
removed entirely. `FlatwaveMDPageComponent` is the single source of truth for rendering.

**Migration**: Consumers using custom page components must compose them with `FlatwaveMDPageComponent`
in their `renderPage` function.
