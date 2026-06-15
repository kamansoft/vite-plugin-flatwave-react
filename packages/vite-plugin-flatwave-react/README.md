# vite-plugin-flatwave-react

Vite content plugin for Markdown-driven, i18n-aware static React sites.

## Install

```bash
npm install vite-plugin-flatwave-react
```

## Configure Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { flatwaveContent } from 'vite-plugin-flatwave-react';

export default defineConfig({
  plugins: [
    react(),
    flatwaveContent({
      contentDir: path.resolve(__dirname, 'src/content'),
      locales: ['es', 'pt'],
      defaultLocale: 'es',
      strictMissingLocales: false,
      componentsDir: path.resolve(__dirname, 'src/components'),
      sitemap: { hostname: 'https://example.com' },
    }),
  ],
});
```

## Content layout

```text
src/
  content/
    es/
      index.md
      about.md
    pt/
      index.md
      about.md
  components/
    SimplePage.tsx
```

Each Markdown file needs baseline frontmatter:

```yaml
---
title: "Page title"
slug: "page-slug"
id: "unique-id"
component: "SimplePage"
public: true
description: "Short description"
canonical: "/es/page-slug"
robots: "index, follow"
keywords: ["tag1", "tag2"]
---

Markdown body.
```

Additional frontmatter fields are preserved in `attributes` and forwarded to the React component.

## React hooks

```ts
import { useFlatwaveContent, useFlatwaveRoutes, useFlatwaveAlternatives } from 'vite-plugin-flatwave-react/react';
```

## Build outputs

During `vite build`, the plugin generates:

- locale-prefixed static HTML route files
- `route-manifest.json`
- `sitemap.xml`
- `robots.txt`
- a virtual module for content lookup

## Validation CLI

```bash
npx flatwave-validate --content-dir src/content --locales es,pt --default-locale es
```

Use `--strict-missing` to fail when locale variants are missing.

## License

MIT © 2026 Flatwave contributors.
