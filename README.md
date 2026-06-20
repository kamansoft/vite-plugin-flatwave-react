# vite-plugin-flatwave-react

[![npm version](https://img.shields.io/npm/v/@kamansoft/vite-plugin-flatwave-react.svg)](https://www.npmjs.com/package/@kamansoft/vite-plugin-flatwave-react)
[![CI](https://github.com/kamansoft/vite-plugin-flatwave-react/actions/workflows/ci.yml/badge.svg)](https://github.com/kamansoft/vite-plugin-flatwave-react/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A Vite plugin that turns a directory of Markdown files into a **fully typed, i18n-aware, statically generated React site** — zero runtime dependencies, no MDX, no server required.

At build time the plugin:

- Scans `src/content/{locale}/*.md` and parses front-matter with [`gray-matter`](https://github.com/jonschlinkert/gray-matter)
- Validates required fields, duplicate IDs, slugs, component references, and missing locale variants
- Exposes a **virtual module** (`virtual:flatwave/content`) with typed helper functions usable in any React component
- Generates locale-prefixed static HTML pages via `react-dom/server`
- Emits `sitemap.xml`, `robots.txt`, and `route-manifest.json`

---

## Table of Contents

1. [Installation](#installation)
2. [Integration](#integration)
   - [Adding the Plugin to Vite](#adding-the-plugin-to-vite)
   - [Content Directory Layout](#content-directory-layout)
   - [Frontmatter Schema](#frontmatter-schema)
3. [Features](#features)
   - [Automatic Route Generation](#automatic-route-generation)
   - [Virtual Module API](#virtual-module-api)
   - [React Hooks](#react-hooks)
   - [Static Site Generation (SSG)](#static-site-generation-ssg)
   - [SSG Hook Phases](#ssg-hook-phases)
   - [Custom Render Strategy](#custom-render-strategy)
   - [SEO and Meta Tags](#seo-and-meta-tags)
   - [Content Validation](#content-validation)
   - [Standalone Validation CLI](#standalone-validation-cli)
   - [Language Switcher](#language-switcher)
   - [Hot Module Replacement](#hot-module-replacement)
4. [Docker-Based Development](#docker-based-development)
5. [Using the Plugin Before npm Publication](#using-the-plugin-before-npm-publication)
6. [Development Commands](#development-commands)
7. [Releases and Versioning](#releases-and-versioning)
8. [Documentation](#documentation)
9. [Contributing](#contributing)

---

## Installation

```bash
npm install @kamansoft/vite-plugin-flatwave-react
```

**Peer dependencies** (must be installed separately):

```bash
npm install vite react react-dom
```

**Node.js ≥ 22.0.0** is required.

---

## Integration

### Adding the Plugin to Vite

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
      contentDir: path.resolve(__dirname, 'src/content'), // where .md files live
      locales: ['es', 'pt'], // all supported locales
      defaultLocale: 'es', // must be in locales[]
      strictMissingLocales: false, // true → missing locale = build error
      componentsDir: path.resolve(__dirname, 'src/components'), // for component validation
      sitemap: {
        hostname: 'https://example.com', // used in sitemap.xml and robots.txt
      },
    }),
  ],
});
```

### Content Directory Layout

The plugin expects one sub-directory per locale inside `contentDir`:

```
src/
  content/
    es/
      index.md
      about.md
      program.md
    pt/
      index.md
      about.md
      program.md
  components/
    SimplePage.tsx      ← referenced by component: 'SimplePage' in frontmatter
    ProgramPage.tsx
    LanguageSwitcher.tsx
    MarkdownRenderer.tsx
```

Each locale must mirror the same set of content IDs. Missing locale variants produce warnings (or errors with `strictMissingLocales: true`).

### Frontmatter Schema

Every `.md` file must include these **required fields**:

```yaml
---
title: 'About Us'
slug: 'about' # URL segment — becomes /{locale}/about
id: 'about' # groups translations: same id across locales
component: 'SimplePage' # React component name in componentsDir
public: true # false → excluded from routes, sitemap, manifest
description: 'Short description'
canonical: '/es/about' # optional, defaults to /{locale}/{slug}
robots: 'index, follow'
keywords:
  - flatwave
  - about
# SEO extras
og:
  title: 'Custom OG Title'
twitter:
  card: 'summary_large_image'
# JSON-LD structured data
jsonLd:
  '@context': 'https://schema.org'
  '@type': 'WebPage'
# Navigation hints
menu: 'main'
menu_position: 2
# Any extra keys are preserved in attributes and forwarded to the component
---
Markdown body here. GitHub-flavoured Markdown. No MDX in v1.
```

**All extra frontmatter keys** not in the baseline list are preserved in `attributes` and forwarded as props to the React component — no schema changes required.

---

## Features

### Automatic Route Generation

Every public `.md` file becomes a locale-prefixed route:

| File                        | Route         |
| --------------------------- | ------------- |
| `src/content/es/index.md`   | `/es/`        |
| `src/content/es/about.md`   | `/es/about`   |
| `src/content/pt/program.md` | `/pt/program` |

The home page is detected when `slug` is `index` or empty (`/`).

At build time, the plugin emits one `{locale}/{slug}/index.html` per route, making the output compatible with any static host (Nginx, Netlify, Vercel, S3, GitHub Pages).

---

### Virtual Module API

Import the virtual module anywhere in your app:

```ts
import {
  getContent,
  getAllContent,
  getRoutes,
  getAlternatives,
  getLocales,
  getDefaultLocale,
} from 'virtual:flatwave/content';

// Get one content entry
const aboutEs = getContent('about', 'es');

// Get all routes for a locale
const esRoutes = getRoutes('es');

// Get alternative locale paths for a language switcher
const alternatives = getAlternatives('about', 'es');
// → { pt: '/pt/about' }

// Get all configured locales
const locales = getLocales(); // ['es', 'pt']

// Get the default locale
const defaultLocale = getDefaultLocale(); // 'es'
```

**TypeScript declarations** are available via `virtual.d.ts` — add this to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@kamansoft/vite-plugin-flatwave-react/virtual"]
  }
}
```

---

### React Hooks

The `@kamansoft/vite-plugin-flatwave-react/react` sub-export provides `useMemo`-wrapped React hooks for ergonomic use in components:

```tsx
import {
  useFlatwaveContent,
  useFlatwaveRoutes,
  useFlatwaveAlternatives,
  useFlatwaveLocales,
} from '@kamansoft/vite-plugin-flatwave-react/react';

function PageComponent({ contentId, locale }: { contentId: string; locale: string }) {
  const content = useFlatwaveContent(contentId, locale);
  const routes = useFlatwaveRoutes(locale);
  const alternatives = useFlatwaveAlternatives(contentId, locale);
  const locales = useFlatwaveLocales();

  if (!content) return <p>Content not found</p>;

  return (
    <article>
      <h1>{content.frontmatter.title as string}</h1>
      <p>{content.body}</p>
      <nav>
        {Object.entries(alternatives).map(([loc, path]) => (
          <a key={loc} href={path}>
            {loc}
          </a>
        ))}
      </nav>
    </article>
  );
}
```

| Hook                                   | Returns                                          |
| -------------------------------------- | ------------------------------------------------ |
| `useFlatwaveContent(id, locale?)`      | One content entry or `undefined`                 |
| `useFlatwaveRoutes(locale?)`           | All routes, optionally filtered by locale        |
| `useFlatwaveAlternatives(id, locale?)` | `{ locale: path }` map (current locale excluded) |
| `useFlatwaveLocales()`                 | All configured locale strings                    |
| `useFlatwaveLocale(locale?)`           | Pass-through locale value                        |

---

### Static Site Generation (SSG)

SSG is **enabled by default**. The plugin renders every public route to a static HTML file at build time using `react-dom/server`:

```ts
flatwaveContent({
  // ...
  ssg: {
    enabled: true, // default: true
    compileMarkdown: {
      allowRawHtml: false, // set true to allow raw HTML in markdown
      remarkPlugins: [], // add custom remark plugins
      rehypePlugins: [], // add custom rehype plugins
    },
  },
});
```

Disable SSG and only use the virtual module + React client-side routing:

```ts
ssg: {
  enabled: false;
}
```

---

### SSG Hook Phases

Inject custom behaviour at any point in the rendering pipeline without modifying the plugin core:

```ts
flatwaveContent({
  // ...
  ssg: {
    enabled: true,
    hooks: {
      // Runs before rendering — mutate/augment the render context
      beforeRender: async (context) => {
        return { ...context, myData: await fetchData(context.route.path) };
      },

      // Transform markdown before it is compiled to HTML
      transformMarkdown: async (markdown, context) => {
        return markdown + `\n\n---\n\nBuilt with Flatwave v1.0`;
      },

      // Transform the final HTML after template rendering
      transformHtml: async (html, context) => {
        const beacon = `<script>console.info('page:', '${context.route.path}');</script>`;
        return html.replace('</body>', beacon + '</body>');
      },

      // Side effects after render — logging, auditing, etc.
      afterRender: async (html, context) => {
        console.log(`[SSG] rendered ${context.route.path} (${html.length} bytes)`);
      },

      // Error recovery — return fallback HTML instead of crashing
      onError: async (error, context) => {
        return `<p>Error rendering ${context.route.path}: ${error.message}</p>`;
      },
    },
  },
});
```

| Hook phase          | Signature            | Use case                                         |
| ------------------- | -------------------- | ------------------------------------------------ |
| `beforeRender`      | `(ctx) → ctx`        | Inject auth tokens, locale overrides, async data |
| `transformMarkdown` | `(md, ctx) → md`     | Pre-process Markdown before compilation          |
| `transformHtml`     | `(html, ctx) → html` | Inject analytics, CSP headers, minification      |
| `afterRender`       | `(html, ctx) → void` | Logging, audit events, side effects              |
| `onError`           | `(err, ctx) → html`  | Return safe fallback HTML on render error        |

---

### Custom Render Strategy

Replace the default `react-dom/server` renderer with your own:

```ts
import { flatwaveContent } from '@kamansoft/vite-plugin-flatwave-react';
import type { RenderStrategy, RenderContext } from '@kamansoft/vite-plugin-flatwave-react/ssg';

class MyServerRenderer implements RenderStrategy {
  async render(context: RenderContext): Promise<string> {
    // Custom rendering: micro-frontends, async data, alternative SSR frameworks
    return `<div data-route="${context.route.path}">${context.contentEntry.body}</div>`;
  }
}

export default defineConfig({
  plugins: [
    flatwaveContent({
      // ...
      ssg: {
        enabled: true,
        strategy: new MyServerRenderer(),
      },
    }),
  ],
});
```

---

### SEO and Meta Tags

SEO metadata is derived automatically from frontmatter fields. For each route the plugin generates:

- `<title>` from `title`
- `<meta name="description">` from `description`
- `<meta name="robots">` from `robots` (default: `index, follow`)
- `<link rel="canonical">` from `canonical` (default: `/{locale}/{slug}`)
- `<link rel="alternate" hreflang="…">` for every locale translation
- `<meta property="og:*">` from the `og` object
- `<meta name="twitter:*">` from the `twitter` object
- `<meta property="og:image">` from `image`
- `<script type="application/ld+json">` from `jsonLd`

All values are properly escaped. No configuration required — it works from frontmatter alone.

---

### Content Validation

The plugin validates content at build time (also exposed as a standalone CLI). Validation catches:

| Rule                                      | Behaviour                                                |
| ----------------------------------------- | -------------------------------------------------------- |
| Missing required fields                   | **Error** — build fails                                  |
| Duplicate content IDs per locale          | **Error** — build fails                                  |
| Duplicate slugs per locale                | **Error** — build fails                                  |
| Duplicate menu positions                  | **Error** — build fails                                  |
| Component not found in `componentsDir`    | **Error** — build fails                                  |
| Content ID missing in one or more locales | **Warning** (or error with `strictMissingLocales: true`) |
| No public routes generated                | **Warning**                                              |

```ts
flatwaveContent({
  // ...
  requiredFields: ['title', 'slug', 'id', 'component', 'public'], // default
  validateComponents: true, // default: true
  strictMissingLocales: false, // default: false
});
```

---

### Standalone Validation CLI

Run the same validation the plugin performs at build time — useful in CI pipelines before building the app:

```bash
npx flatwave-validate \
  --content-dir src/content \
  --locales es,pt \
  --default-locale es \
  --components-dir src/components \
  --strict-missing   # optional: missing locale → error instead of warning

# Exit code 0 → passed
# Exit code 1 → errors found
```

| Option                      | Description                                                                 |
| --------------------------- | --------------------------------------------------------------------------- |
| `--content-dir <dir>`       | Path to the content directory                                               |
| `--locales <list>`          | Comma-separated locale identifiers                                          |
| `--default-locale <locale>` | The primary locale                                                          |
| `--components-dir <dirs>`   | Comma-separated component directories (default: `src/components,src/pages`) |
| `--strict-missing`          | Treat missing locale variants as errors                                     |
| `--no-validate-components`  | Skip component existence check                                              |

---

### Language Switcher

Use `getAlternatives()` (or `useFlatwaveAlternatives()`) to build a language switcher with zero configuration:

```tsx
import { getAlternatives } from 'virtual:flatwave/content';

function LanguageSwitcher({
  contentId,
  currentLocale,
}: {
  contentId: string;
  currentLocale: string;
}) {
  const alternatives = getAlternatives(contentId, currentLocale);

  return (
    <nav aria-label="Language switcher">
      {Object.entries(alternatives).map(([locale, path]) => (
        <a key={locale} href={path}>
          {locale.toUpperCase()}
        </a>
      ))}
    </nav>
  );
}
```

`getAlternatives('about', 'es')` returns `{ pt: '/pt/about' }` — all locales except the current one, each pre-computed to the correct route.

---

### Hot Module Replacement

In dev mode (`vite dev`), the plugin watches `.md` files. Any save to a Markdown file triggers a full content index rebuild and hot-reloads the virtual module, so your running app immediately reflects the updated content — no page reload required.

---

## Docker-Based Development

The `docker/` folder provides a ready-to-use Compose stack. This is the recommended approach to avoid Node.js version conflicts with your host system:

```bash
# Dev server with hot-reload — http://localhost:8080
docker compose -f docker/docker-compose.yml up dev

# Production build
docker compose -f docker/docker-compose.yml up build

# Serve the built static site via nginx — http://localhost:4173
docker compose -f docker/docker-compose.yml up static
```

See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md#docker-development-environment) for full Docker details.

---

## Using the Plugin Before npm Publication

If you want to use an unreleased local build of the plugin in another React project, reference it via a `file:` path dependency:

```json
// your-react-project/package.json
{
  "dependencies": {
    "@kamansoft/vite-plugin-flatwave-react": "file:../vite-plugin-flatwave-react/packages/vite-plugin-flatwave-react"
  }
}
```

```bash
# 1. Build the plugin first
cd vite-plugin-flatwave-react && npm run build:plugin

# 2. Install in your project (copies dist/ at install time)
cd your-react-project && npm install
```

After any plugin code change, re-run `npm run build:plugin` and `npm install` in your project.

For `npm link` instructions and more detail, see [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md#installing-the-package-for-local-development).

---

## Development Commands

Run these from the **monorepo root**:

| Command                                                 | What it does                                             |
| ------------------------------------------------------- | -------------------------------------------------------- |
| `npm run build:plugin`                                  | Compile `packages/vite-plugin-flatwave-react` → `dist/`  |
| `npm run build:example`                                 | Build `examples/basic-react-site`                        |
| `npm run build`                                         | Both of the above                                        |
| `npm run dev -w @flatwave/example-basic-react-site`     | Dev server on port 8080                                  |
| `npm run preview -w @flatwave/example-basic-react-site` | Preview build on port 4173                               |
| `npm run lint`                                          | ESLint across all packages                               |
| `npm run format`                                        | Prettier writes all files                                |
| `npm run format:check`                                  | Prettier check (CI mode)                                 |
| `npm run type-check`                                    | TypeScript strict check                                  |
| `npm run test`                                          | Vitest unit + integration                                |
| `npm run test:e2e`                                      | End-to-end build + serve + assert                        |
| `npm run validate`                                      | Full CI gate (format + lint + type-check + build + test) |
| `npm run validate:example`                              | Run `flatwave-validate` CLI against example content      |

---

## Releases and Versioning

Releases are **fully automated** via [semantic-release](https://github.com/semantic-release/semantic-release). Every PR merged into `main` with a `feat:` or `fix:` title triggers a new npm publish. No tokens stored — uses npm OIDC trusted publishing.

| PR title starts with                  | Version bump            |
| ------------------------------------- | ----------------------- |
| `feat:`                               | minor (`1.1.0 → 1.2.0`) |
| `fix:`                                | patch (`1.2.0 → 1.2.1`) |
| `feat!:` or `BREAKING CHANGE:` footer | major (`1.2.1 → 2.0.0`) |
| `chore:`, `docs:`, `ci:`, etc.        | none                    |

---

## Documentation

| Document                                                                                                                                                                             | Description                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| [docs/Architecture.md](./docs/Architecture.md)                                                                                                                                       | System architecture, module breakdown, mermaid diagrams, type system, and glossary        |
| [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)                                                                                                                                         | Coding standards (SOLID, DRY, TypeScript), linting, Husky, Git workflow, Docker, npm link |
| [docs/ci-cd-release-automation.md](./docs/ci-cd-release-automation.md)                                                                                                               | Detailed CI/CD pipeline, semantic-release configuration, OIDC publishing setup            |
| [docs/Vite-Plugin-Architecture-for-Markdown-Driven-i18n-Aware-Static-Content-Builders.md](./docs/Vite-Plugin-Architecture-for-Markdown-Driven-i18n-Aware-Static-Content-Builders.md) | Original architecture design reference                                                    |

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR.

All pull requests must:

- Use a [Conventional Commits](https://www.conventionalcommits.org/) PR title
- Pass `npm run validate` (format + lint + type-check + build + test)

**[→ Read the contribution guide](./CONTRIBUTING.md)**
