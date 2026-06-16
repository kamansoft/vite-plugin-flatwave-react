# vite-plugin-flatwave-react

A Vite plugin for **Markdown‑driven, i18n‑aware static React sites**.  
It scans Markdown files with front‑matter, builds a typed content index, exposes virtual modules for the client, generates locale‑prefixed static HTML, sitemap, robots.txt and route manifest, and provides a validation CLI. **New in v0.1: build-time pre-rendering (SSG) with full React component hydration.**

> **Note:** The package is prepared for npm publication as `vite-plugin-flatwave-react`. Until you publish it, use the local file dependency instructions below.

---

## Quick start (local development)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/vite-plugin-flatwave-react.git
cd vite-plugin-flatwave-react

# 2. Install all workspace dependencies (plugin, example app, test tooling)
npm install
```

The repository is a **npm workspaces** monorepo:

```
vite-plugin-flatwave-react/
├─ packages/vite-plugin-flatwave-react   # the reusable plugin
├─ examples/basic-react-site              # minimal React + Vite example
├─ docker/                               # Docker Compose for dev / build / static preview
└─ e2e/                                  # Vitest end‑to‑end test
```

---

## Using the plugin in your own project (local file dependency)

Until the package lands on npm, depend on the built plugin via a **file:** reference.

```json
// your-project/package.json
{
  "dependencies": {
    "vite-plugin-flatwave-react": "file:../vite-plugin-flatwave-react/packages/vite-plugin-flatwave-react"
  }
}
```

Then run `npm install` in your project. The plugin will be linked to the local `dist/` output, so you must build it first:

```bash
# From the monorepo root
npm run build:plugin          # compiles packages/vite-plugin-flatwave-react → dist/
```

After the package is published, replace the `file:` dependency with:

```json
{
  "dependencies": {
    "vite-plugin-flatwave-react": "^0.1.0"
  }
}
```

---

## Adding the plugin to a Vite + React project

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
      contentDir: path.resolve(__dirname, 'src/content'), // markdown files live here
      locales: ['es', 'pt'],                               // supported languages
      defaultLocale: 'es',                                 // must be included in locales
      strictMissingLocales: false,                         // warn only; true = fail build
      componentsDir: path.resolve(__dirname, 'src/components'), // optional component validation
      sitemap: { hostname: 'https://example.com' },       // used for sitemap.xml & robots.txt
      
      // NEW: Build-time pre-rendering (SSG) options
      prerender: true,                                     // enable SSG pre-rendering
      ssrEntry: 'src/entry-server.tsx',                   // custom SSR entry (optional)
    }),
  ],
});
```

### SSG Pre-rendering Configuration

```ts
// Full prerender options
flatwaveContent({
  // ...other options
  prerender: {
    routes: ['/es/', '/es/about'],        // explicit routes to pre-render (optional)
    exclude: ['/admin/*'],                // glob patterns to skip (optional)
    stream: true,                         // use streaming render (optional)
  },
  ssrEntry: 'src/entry-server.tsx',      // SSR entry point
});
```

**Directory layout expected by the plugin**

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
    SimplePage.tsx
    ProgramPage.tsx
    LanguageSwitcher.tsx
    MarkdownRenderer.tsx
  entry-server.tsx          # SSR entry for pre-rendering (when prerender: true)
```

Each `.md` file must contain at least the **baseline front‑matter** fields:

```yaml
---
title: "Page title"
slug: "page-slug"          # URL segment, without leading slash
id: "unique-id"            # groups translations together
component: "SimplePage"    # React component name (must exist under componentsDir)
public: true               # false → omitted from route manifest / sitemap
description: "Short description"
canonical: "/es/page-slug" # optional, defaults to locale‑prefixed route
robots: "index, follow"
keywords: [ "tag1", "tag2" ]
# Any additional keys are preserved in `attributes` and forwarded to the component
---
Markdown body (GitHub‑flavoured, no MDX in v1)
```

---

## Build-time Pre-rendering (SSG)

When `prerender: true` is enabled, the plugin performs a **two-step build** to generate fully pre-rendered static HTML with React component hydration.

### How it works

1. **Client build** (`vite build`) — produces client bundle and static assets
2. **SSR build** (`vite build --ssr src/entry-server.tsx`) — produces server bundle  
3. **Pre-render script** — loads SSR bundle, renders each route, writes static HTML

### Example app setup

**1. Create SSR entry** (`src/entry-server.tsx`):

```tsx
import { renderToString } from 'react-dom/server';
import { getRoutes, getContent } from 'virtual:flatwave/content';
import type { FlatwaveRoute, FlatwaveContentEntry } from 'vite-plugin-flatwave-react/types';
import { SimplePage } from './components/SimplePage';
import { ProgramPage } from './components/ProgramPage';

interface PageContext {
  locale: string;
  content: FlatwaveContentEntry;
  route: FlatwaveRoute;
  components: Record<string, React.ComponentType<any>>;
}

const components: Record<string, React.ComponentType<any>> = {
  SimplePage,
  ProgramPage,
};

export function registerComponent(name: string, component: React.ComponentType<any>) {
  components[name] = component;
}

export async function render(url: string, pageContext: PageContext): Promise<string> {
  const { route, content, locale, components: passedComponents } = pageContext;
  const componentRegistry = { ...components, ...passedComponents };
  const Component = componentRegistry[content.component] || SimplePage;
  
  const bodyHtml = content.body; // or use markdown-it for SSR markdown rendering

  const App = () => (
    <html lang={locale}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{route.metadata.title}</title>
        {route.metadata.description && <meta name="description" content={route.metadata.description} />}
        <link rel="canonical" href={route.metadata.canonical ?? route.path} />
        {renderHtmlHead(route)}
      </head>
      <body>
        <div id="root">
          <Component content={content} />
          <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </div>
      </body>
    </html>
  );

  return renderToString(<App />);
}

function renderHtmlHead(route: FlatwaveRoute): string {
  // ... renders hreflang, Open Graph, Twitter, JSON-LD, etc.
}
```

**2. Update `package.json` scripts**:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build && vite build --ssr src/entry-server.tsx --outDir dist-ssr",
    "prerender": "node scripts/prerender.mjs",
    "preview": "vite preview"
  }
}
```

**3. Run the full pipeline**:

```bash
npm run build      # client + SSR bundle
npm run prerender  # generates pre-rendered HTML in dist/
```

### Pre-rendered output

Each route gets fully rendered HTML with:

- ✅ Complete React component tree (no empty `<div id="root">`)
- ✅ Markdown body rendered to HTML via `markdown-it`
- ✅ All SEO metadata (title, description, canonical, hreflang, Open Graph, Twitter, JSON-LD)
- ✅ Client-side hydration script for interactivity
- ✅ Per-locale output: `dist/{locale}/{route}/index.html`

```
dist/
├── es/
│   ├── index.html
│   ├── about/index.html
│   └── program/index.html
├── pt/
│   ├── index.html
│   ├── about/index.html
│   └── program/index.html
├── route-manifest.json
├── sitemap.xml
├── robots.txt
└── assets/
    ├── index-*.js
    └── index-*.css
```

---

## Development workflow (monorepo)

| Command | What it does |
|---------|---------------|
| `npm run build:plugin` | `tsc` compiles `packages/vite-plugin-flatwave-react` → `dist/` |
| `npm run build:example` | Builds the React example (`examples/basic-react-site`) using the local plugin |
| `npm run build` | Runs both of the above |
| `npm run validate:example` | Executes the standalone validation CLI against the example content |
| `npm run test:e2e` | Builds everything, starts a static `serve` on `dist/`, runs Vitest e2e checks |
| `npm run dev -w @flatwave/example-basic-react-site` | Starts Vite dev server for the example (port 8080) |
| `npm run preview -w @flatwave/example-basic-react-site` | Serves the production build (`dist/`) on port 4173 |

All commands are defined in the **root `package.json`** (workspace scripts).

---

## Running the React example locally (without Docker)

```bash
# 1️⃣ Build the plugin (once)
npm run build:plugin

# 2️⃣ Start the example dev server
npm run dev -w @flatwave/example-basic-react-site
# → open http://localhost:8080
```

The example demonstrates:

* locale‑prefixed routes (`/es/`, `/pt/about`, …)  
* browser language detection redirect from `/`  
* `LanguageSwitcher` built from `getAlternatives()`  
* `react-markdown` rendering via `MarkdownRenderer`  
* SEO tags, `sitemap.xml`, `robots.txt`, `route-manifest.json` generated at build time
* **NEW:** Build-time pre-rendering with full React hydration

---

## Docker‑based development & CI

The `docker/` folder contains a ready‑to‑run Compose stack.

```bash
# Build images and start dev server (hot‑reload)
docker compose -f docker/docker-compose.yml up dev

# Build production artefacts (runs `npm run build` inside container)
docker compose -f docker/docker-compose.yml up build

# Serve the generated static site with nginx (port 4173)
docker compose -f docker/docker-compose.yml up static
# → open http://localhost:4173/es/about
```

**Files**

| File | Purpose |
|------|---------|
| `docker/docker-compose.yml` | Orchestrates `dev`, `build`, `static` services |
| `docker/dev.Dockerfile` | Installs deps, runs `npm run dev` |
| `docker/build.Dockerfile` | Installs deps, runs `npm run build` |
| `docker/nginx.conf` | SPA fallback + static file serving |

The same stack is used by the **e2e test** (`npm run test:e2e`) to guarantee that the produced `dist/` works behind a real static server.

---

## Standalone validation CLI

After building the plugin you get a binary `flatwave-validate`.

```bash
node packages/vite-plugin-flatwave-react/dist/cli/validate.js \
  --content-dir examples/basic-react-site/src/content \
  --locales es,pt \
  --default-locale es \
  --components-dir examples/basic-site/src/components \
  --strict-missing   # optional: turn missing‑locale warnings into errors
```

*Exit code 0* → validation passed (warnings printed to stderr).  
*Exit code 1* → errors found (or strict‑missing triggered).

The CLI re‑uses the exact same validator the Vite plugin runs at `buildStart`, guaranteeing parity between CI and local dev.

---

## Project structure recap

```
vite-plugin-flatwave-react/
├─ packages/vite-plugin-flatwave-react/
│   ├─ src/
│   │   ├─ index.ts                 # main plugin factory
│   │   ├─ content/                 # scanner, parser, validator, route builder
│   │   ├─ seo/metadata.ts          # HTML head helpers
│   │   ├─ react/index.ts           # React hooks (useFlatwaveContent, …)
│   │   ├─ prerender/               # SSG pre-rendering module
│   │   │   ├─ index.ts             # createPrerenderer + plugin
│   │   │   ├─ renderer.ts          # SSR rendering wrapper + route filtering
│   │   │   └─ template.ts          # HTML template handling
│   │   ├─ cli/validate.ts          # flatwave-validate entry point
│   │   └─ virtual.d.ts             # TypeScript declarations for virtual modules
│   ├─ templates/
│   │   └─ entry-server.tsx         # default SSR entry template
│   ├─ tsconfig.build.json
│   └─ package.json
├─ examples/basic-react-site/        # minimal React + Vite consumer
│   ├─ src/
│   │   ├─ content/{es,pt}/*.md
│   │   ├─ components/*.tsx
│   │   ├─ entry-server.tsx         # SSR entry for SSG
│   │   ├─ App.tsx / main.tsx
│   │   └─ styles.css
│   ├─ scripts/prerender.mjs        # pre-render script
│   ├─ vite.config.ts
│   └─ package.json
├─ docker/                           # Compose + Dockerfiles + nginx
├─ e2e/example.test.ts              # Vitest end‑to‑end suite
├─ docs/
│   └─ ARCHITECTURE.md              # architecture documentation
└─ package.json                      # root workspace + helper scripts
```

---

## Publishing to npm

The package metadata is configured for public npm publication from `packages/vite-plugin-flatwave-react`.

### One-time local publish

1. Log in locally:

   ```bash
   npm adduser
   npm whoami
   ```

2. From the monorepo root, build and inspect the package tarball:

   ```bash
   npm run build:plugin
   npm pack --workspace=vite-plugin-flatwave-react --dry-run
   ```

3. Publish from the package directory:

   ```bash
   cd packages/vite-plugin-flatwave-react
   npm publish --provenance --access public
   ```

For the first public scoped package publish, `--access public` is required. This package is currently configured as an unscoped package, but the flag is harmless and keeps the command ready if you later change the name to `@kamansoft/vite-plugin-flatwave-react`.

### Automatic publish on merged PRs

The release workflow listens for merged PRs to `main`. When a PR is merged, GitHub Actions:

1. Checks out `main`.
2. Reads `packages/vite-plugin-flatwave-react/package.json`.
3. Preserves the `MAJOR` and `MINOR` numbers already present in the PR.
4. Increments only the `PATCH` number.
5. Updates `package-lock.json`.
6. Commits and pushes the version bump back to `main`.
7. Publishes the bumped version to npm with provenance.

Examples:

| Version in merged PR | Version published by workflow |
|----------------------|-------------------------------|
| `1.0.0`              | `1.0.1`                       |
| `1.1.0`              | `1.1.1`                       |
| `1.1.1`              | `1.1.2`                       |
| `2.0.0`              | `2.0.1`                       |

This means PR authors can change major or minor versions, while the workflow only advances the patch number.

### Recommended CI publish with trusted publishing

Trusted publishing avoids long‑lived npm tokens. Configure it on npmjs.com for the package:

- Organization/user: `kamansoft`
- Repository: `vite-plugin-flatwave-react`
- Workflow filename: `release.yml`
- Allowed action: `npm publish` or `npm stage publish`
- Environment: optional

The workflow uses GitHub‑hosted runners, Node 24, `id-token: write`, and `npm publish --provenance --access public`.

### Token fallback

If you do not use trusted publishing, create an npm granular access token or automation token with bypass-2FA enabled for write actions, then store it as a repository secret named `NPM_TOKEN`. The workflow falls back to that secret when trusted publishing is not configured.

### Manual versioning

npm never reuses a published name/version pair. Before publishing, update:

```bash
npm version patch --workspace=vite-plugin-flatwave-react
```

Then run the build and publish commands again.

---

## Contributing / extending

1. **Add a new locale** – drop a folder under `src/content/<locale>/` and add the locale to `locales` in `vite.config.ts`.  
2. **New component** – create `src/components/MyComponent.tsx`, reference it in front‑matter (`component: "MyComponent"`).  
3. **Extra front‑matter** – any key not in the baseline list is kept in `attributes` and passed to the component; no schema changes required.  
4. **Custom SSG adapter** – the plugin emits a `route-manifest.json`; write a small script that reads it and renders HTML with your favourite framework (the built‑in SSG is a tiny Vite‑native static generator, but the inventory is adapter‑neutral).

---

## License

MIT © 2026 – Flatwave contributors.