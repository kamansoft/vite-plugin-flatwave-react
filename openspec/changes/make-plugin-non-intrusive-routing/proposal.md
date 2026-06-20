## Why

The plugin currently generates routes automatically during SSG, coupling users to the plugin's routing decisions. Users should have full control over their routing - importing content data and building their own route structure while leveraging the plugin's content indexing and i18n utilities.

## What Changes

- **Remove**: Automatic route file generation (`/{locale}/path/index.html`)
- **Remove**: Automatic sitemap.xml, robots.txt generation
- **Keep**: Content indexing and virtual module (`virtual:flatwave/content`)
- **Keep**: Markdown compilation to HTML
- **Keep**: Composable React components (`FlatwaveLanguageRouter`, `FlatwaveAppRoutes`, etc.)
- **Add**: `getRoutes()` and `getContent()` remain available for consumers to build custom routing
- **Keep**: Hook system (beforeRender, transformMarkdown, etc.) for customization
- **BREAKING**: No automatic HTML file output - consumers must implement their own rendering

## Capabilities

### New Capabilities

- `non-intrusive-ssg`: Plugin provides content/indexing tools without enforcing route structure

### Modified Capabilities

- `flatwave-md-page-component`: Remove SSG fallback behavior; component is client-side only
- `flatwave-language-router`: Must work with user-provided routes, not auto-generated routes

## Impact

- `src/ssg/runSsg.ts`: Remove route rendering loop, keep hook execution
- `src/ssg/RenderPipeline.ts`: Keep hook infrastructure
- `src/index.ts`: Keep virtual module and exports, remove auto-SSG plugin
- Example site will need to use `FlatwaveLanguageRouter` or custom routing
- `CHANGELOG.md`: Breaking change requires major version bump
