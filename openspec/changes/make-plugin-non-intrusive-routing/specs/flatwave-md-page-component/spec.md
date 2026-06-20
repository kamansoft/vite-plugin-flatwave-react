## MODIFIED Requirements

### Requirement: DefaultRenderStrategy uses FlatwaveMDPageComponent as primary renderer

The plugin's `DefaultRenderStrategy` SHALL use `FlatwaveMDPageComponent` as the **primary renderer**
for every SSG route. It SHALL pass `markdownHtml` (pre-compiled body), `frontmatter`, and `locale` from
`RenderContext` to the component, wrapping it in `HelmetProvider` for correct SSR head tag extraction.

`DefaultRenderStrategy` SHALL fall back to a consumer-supplied component only when ALL of the following
are true:

1. `componentsDir` is configured in plugin options, AND
2. The route's `component` frontmatter field names a module that resolves in `componentsDir`

When neither condition is met, `FlatwaveMDPageComponent` is used — never the compiled markdown string
alone.

#### Scenario: SSG generates route using FlatwaveMDPageComponent by default

- **WHEN** no `componentsDir` is configured and frontmatter has no `component` field
- **THEN** `DefaultRenderStrategy` renders `<HelmetProvider><FlatwaveMDPageComponent ... /></HelmetProvider>`
  via `renderToString` and produces valid HTML with `<main>`, rendered markdown body, and head tags

#### Scenario: SSG uses consumer component when override is found

- **WHEN** `componentsDir` is configured AND `route.component === 'ProgramPage'` resolves in that directory
- **THEN** `DefaultRenderStrategy` renders using the `ProgramPage` module instead

#### Scenario: No data-ssg-error appears in generated HTML

- **WHEN** the SSG pipeline runs and no consumer component override is found
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
