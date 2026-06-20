# Non-Intrusive SSG Specification

## Purpose

Plugin provides content indexing and virtual module without enforcing route structure or automatic HTML generation.

## Requirements

### Requirement: Plugin exposes virtual module only

The plugin SHALL export `virtual:flatwave/content` providing `getContent()`, `getRoutes()`, `getAllContent()`, and `getAlternatives()` functions without auto-generating routes.

#### Scenario: Virtual module is available

- **WHEN** a consumer imports from `virtual:flatwave/content`
- **THEN** the module resolves with content lookup functions

### Requirement: Plugin does not generate HTML files

The `flatwave-react:ssg` plugin SHALL NOT generate `{locale}/{path}/index.html` files automatically.

#### Scenario: No route files after build

- **WHEN** `vite build` completes
- **THEN** no HTML files are created in `dist/` except the default Vite output

### Requirement: Plugin provides hook infrastructure

The `RenderPipeline.executeEmitFiles()` method SHALL remain available for consumers to generate custom output files (e.g., navigation manifests).

#### Scenario: emitFiles hook can be used

- **WHEN** a consumer provides `ssg.hooks.emitFiles` in config
- **THEN** the hook is called and can emit custom files
