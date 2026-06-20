## 1. Remove auto-route generation from flatwave-react:ssg

- [ ] 1.1 Remove route rendering loop from runSsg.ts
- [ ] 1.2 Remove automatic HTML file emission in generateBundle hook
- [ ] 1.3 Remove sitemap.xml, robots.txt, route-manifest.json generation
- [ ] 1.4 Remove DefaultRenderStrategy usage (no longer needed)
- [ ] 1.5 Keep hook infrastructure (beforeRender, transformMarkdown, etc.)

## 2. Update plugin exports

- [ ] 2.1 Keep `flatwaveContent()` factory function
- [ ] 2.2 Keep virtual module generation
- [ ] 2.3 Export content utilities (getContent, getRoutes, etc.)
- [ ] 2.4 Remove automatic SSG plugin from returned Plugin[]

## 3. Update composable React components

- [ ] 3.1 FlatwaveMDPageComponent: Remove SSG-specific fallback logic
- [ ] 3.2 FlatwaveLanguageRouter: Remove auto-route generation, require renderPage
- [ ] 3.3 FlatwaveAppRoutes: Require routes prop, no virtual module fallback
- [ ] 3.4 Keep FlatwaveMDComponent for content rendering

## 4. Update example site

- [ ] 4.1 Use FlatwaveLanguageRouter with custom renderPage
- [ ] 4.2 Implement custom route structure
- [ ] 4.3 Add emitFiles hook for custom navigation JSON
