# vite-plugin-flatwave-react

Vite plugin for Markdown-driven, i18n-aware static React sites with composable React components.

## What It Does

`vite-plugin-flatwave-react` enables you to build static React sites from Markdown content with:

- **Multilingual routing** - Automatic locale-prefixed route generation (`/es/about`, `/pt/about`)
- **Content-driven development** - Markdown files define routes via frontmatter
- **Static site generation** - Pre-rendered HTML at build time
- **Composable React components** - Drop-in components for content rendering, language routing, and navigation

## How It Works

1. **Content indexing** - Scans `contentDir` for `.md` files, organizes by locale
2. **Virtual module** - Exposes `virtual:flatwave/content` with `getContent()`, `getRoutes()`, etc.
3. **SSG pipeline** - Compiles Markdown to HTML, renders via your React components, outputs static files
4. **Hook system** - Customize the pipeline with `ssg.hooks.transformMarkdown`, `transformHtml`, `emitFiles`

## Install

```bash
npm install @kamansoft/vite-plugin-flatwave-react react-markdown react-helmet-async react-router-dom
```

Peer dependencies required at runtime:

- `react` >= 18.0.0
- `react-dom` >= 18.0.0
- `react-markdown` ^10.0.0
- `react-helmet-async` ^2.0.0
- `react-router-dom` ^6.0.0
- `vite` ^5.0.0 || ^6.0.0 || ^7.0.0

## Configure Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { flatwaveContent } from '@kamansoft/vite-plugin-flatwave-react';

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
      ssg: {
        enabled: true,
        hooks: {
          transformMarkdown: async (md, ctx) => md + '\n\nBuilt with Flatwave.',
        },
      },
    }),
  ],
});
```

## Content Layout

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

### Markdown Frontmatter

```yaml
---
title: 'Page title'
slug: 'page-slug'
id: 'unique-id'
component: 'SimplePage'
public: true
description: 'Short description'
canonical: '/es/page-slug'
robots: 'index, follow'
og:
  title: 'OG Title'
  description: 'OG Description'
---
Markdown body here.
```

## Composable React Components

### FlatwaveMDComponent

Renders Markdown content. Use in SSG mode (`markdownHtml`) or client-side (`markdown`).

```tsx
import { FlatwaveMDComponent } from '@kamansoft/vite-plugin-flatwave-react/react';

function MyContent(props: FlatwaveMDComponentProps) {
  return (
    <FlatwaveMDComponent
      frontmatter={props.frontmatter}
      markdownHtml={compiledHtml}
      locale={props.locale}
    />
  );
}
```

Props:

- `frontmatter` - Content metadata
- `markdownHtml` - Pre-compiled HTML (SSG mode)
- `markdown` - Raw Markdown (client-side mode)
- `locale` - Current locale for context
- `className`, `style` - Optional styling
- `children` - Render prop `(rendered, frontmatter) => ReactNode`

### FlatwaveMDPageComponent

Full-page wrapper with SEO head tags via `react-helmet-async`.

```tsx
import { FlatwaveMDPageComponent } from '@kamansoft/vite-plugin-flatwave-react/react';

function MyPage(props: FlatwaveMDPageProps) {
  return <FlatwaveMDPageComponent {...props} pageWrapper={BrandedLayout} />;
}
```

Props:

- All `FlatwaveMDComponent` props
- `pageWrapper?: React.ComponentType<{ children, frontmatter, locale }>` - Layout wrapper
- `loadingFallback?: React.ReactNode` - Loading state

### FlatwaveLanguageRouter

Complete router setup with language detection.

```tsx
import { FlatwaveLanguageRouter } from '@kamansoft/vite-plugin-flatwave-react/react';

function App() {
  return (
    <FlatwaveLanguageRouter
      supportedLanguages={['es', 'pt']}
      defaultLanguage="es"
      onLanguageChange={(lang) => console.log('Language changed:', lang)}
      layoutWrapper={Layout}
      renderPage={(route, locale) => (
        <FlatwaveMDPageComponent frontmatter={route.frontmatter} locale={locale} />
      )}
    />
  );
}
```

See: `examples/basic-react-site/` for a working demonstration.

## React Hooks

```ts
import {
  useFlatwaveContent,
  useFlatwaveRoutes,
  useFlatwaveAlternatives,
  useFlatwaveLanguage,
} from '@kamansoft/vite-plugin-flatwave-react/react';

// Get content by ID
const content = useFlatwaveContent('about', 'es');

// Get all routes for a locale
const routes = useFlatwaveRoutes('es');

// Get alternative language URLs
const alts = useFlatwaveAlternatives('about', 'es');

// Get current locale from context
const { locale, supportedLanguages } = useFlatwaveLanguage();
```

## Build Outputs

During `vite build`, the plugin generates:

- `/es/about/index.html`, `/pt/about/index.html` - Locale-prefixed static HTML
- `route-manifest.json` - All route metadata
- `sitemap.xml` - SEO sitemap
- `robots.txt` - Search engine directives

## Validation CLI

```bash
npx flatwave-validate --content-dir src/content --locales es,pt --default-locale es
```

Use `--strict-missing` to fail when locale variants are missing.

## License

MIT © 2026 Flatwave contributors.
