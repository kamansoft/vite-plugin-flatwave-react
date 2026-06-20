## Context

Currently the plugin auto-generates routes during SSG, outputting static HTML files to `dist/{locale}/path/index.html`. This couples consumers to the plugin's routing decisions. Users should control their own Vite/Rollup configuration and routing structure, importing content via the virtual module.

## Goals / Non-Goals

**Goals:**

- Plugin provides content indexing and virtual module without auto-route generation
- Composable React components (`FlatwaveLanguageRouter`, `FlatwaveAppRoutes`) remain available for users to build their own routing
- Hooks (`transformMarkdown`, `beforeRender`, etc.) remain available for customization
- No automatic output files (routes, sitemap, robots) - consumers handle all output

**Non-Goals:**

- Maintaining current auto-SSG behavior
- Keeping automatic sitemap.xml generation
- Supporting zero-config route creation

## Decisions

### Decision 1: Remove auto-route generation, keep content pipeline

**Rationale**: Users know their routing needs best. The plugin provides data; they decide how to render.
**Alternatives**: Could keep optional flag, but adds complexity. Better to remove entirely and let consumers compose.

### Decision 2: Keep virtual module

**Rationale**: `virtual:flatwave/content` is the core product - indexed, typed content access.
**Alternatives**: None viable - this is the primary value.

### Decision 3: Keep composable React components

**Rationale**: These are the main way users interact with content (`FlatwaveLanguageRouter`, `FlatwaveMDComponent`, etc.).
**Alternatives**: Could remove, but defeats the purpose of composability.

### Decision 4: Remove SSG plugin from output

**Rationale**: `flatwave-react:ssg` generates route files. Users should use their own render approach (SSR, SPA, SSG frameworks).
**Alternatives**: Keep for backward compatibility, but creates coupling.

## Risks / Trade-offs

[**Breaking change**] → Major version bump required; existing users must migrate routing
[**Increased setup complexity**] → Users must write routing code, but gain flexibility
[**No out-of-box HTML output**] → Users must integrate with their build pipeline (VitePress, Astro, custom)
