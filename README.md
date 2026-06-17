# vite-plugin-flatwave-react

A Vite plugin for **Markdown‑driven, i18n‑aware static React sites** with a **single render pipeline** for build-time SSR and client hydration/navigation.

It scans Markdown files with front‑matter, builds a typed content index, exposes virtual modules for the client, generates locale‑prefixed static HTML with full React pre-rendering and SEO metadata, provides a client-side render loop for SPA navigation, and includes a validation CLI.

---

## Quick Start (Local Development)

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
└─ e2e/                                  # Vitest end-to-end test
```

---

## Using the Plugin in Your Own Project (Local File Dependency)

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

## Adding the Plugin to a Vite + React Project

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
      
      // Build-time pre-rendering (SSG) options
      prerender: true,                                     // enable SSG pre-rendering
      ssrEntry: 'src/entry-server.tsx',                   // custom SSR entry (optional)
    }),
  ],
});
```

### Pre-rendering Configuration

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

## Client-Side Render Loop (NEW in v0.1)

The package exports a **single render pipeline** under `vite-plugin-flatwave-react/render-loop` that provides:

- **Build-time SSR** via `createPrerenderer()` — generates complete static HTML with React component tree
- **Client hydration & navigation** via `startRenderLoop()` — pathname routing, History API, manual scroll restoration
- **SEO-complete initial HTML** — works without JavaScript, enhances on load

### Client Entry (`main.tsx`)

```tsx
import { startRenderLoop } from 'vite-plugin-flatwave-react/render-loop';
import { App } from './App';
import './styles.css';

startRenderLoop({
  root: document.getElementById('root')!,
  App,
});
```

### App Component (`App.tsx`)

```tsx
import { useFlatwaveRoute } from 'vite-plugin-flatwave-react/render-loop';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ProgramPage } from './components/ProgramPage';
import { SimplePage } from './components/SimplePage';

export function App({ pageContext }: { pageContext: { locale: string; content: any; route: any } }) {
  const { content } = pageContext;

  const Component = content.component === 'ProgramPage' ? ProgramPage : SimplePage;

  return (
    <main>
      <LanguageSwitcher currentLocale={content.locale} contentId={content.id} />
      <Component content={content} />
      <MarkdownRenderer>{content.body}</MarkdownRenderer>
    </main>
  );
}
```

### Runtime API

```ts
import {
  startRenderLoop,      // Initialize render controller, hydrate #root
  navigateTo,           // Imperative navigation
  getCurrentPath,       // Get current route path
  onNavigate,           // Subscribe to navigation events
  getPageContext,       // Get current page context
  useFlatwaveRoute,     // React hook for current route
} from 'vite-plugin-flatwave-react/render-loop';
```

**Key behaviors:**
- **Pathname routing only** — `/es/about`, `/pt/program` (no hash routing)
- **No client data fetching** — uses serialized route inventory from virtual module
- **Manual scroll restoration** — save before navigation, restore on back/forward
- **Unknown route rejection** — no client 404, document unchanged
- **Hydration** — `hydrateRoot` once, then `root.render()` for route changes

---

## Build-time Pre-rendering (SSG)

When `prerender: true` is enabled, the plugin performs a **two-step build** to generate fully pre-rendered static HTML:

1. **Client build** (`vite build`) — produces client bundle and static assets
2. **SSR build** (`vite build --ssr src/entry-server.tsx`) — produces server bundle  
3. **Pre-render script** — loads SSR bundle, renders each route, writes static HTML

### SSR Entry (`src/entry-server.tsx`)

```tsx
import { renderToString } from 'react-dom/server';
import { getRoutes, getContent } from 'virtual:flatwave/content';
import type { FlatwaveRoute, FlatwaveContentEntry } from 'vite-plugin-flatwave-react/types';
import { SimplePage } from './components/SimplePage';
import { ProgramPage } from './components/ProgramPage';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt();

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
  
  const bodyHtml = md.render(content.body);

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

### Package.json Scripts

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

### Pre-render Script (`scripts/prerender.mjs`)

```js
import { createPrerenderer } from 'vite-plugin-flatwave-react/render/server';
import { buildIndex } from 'vite-plugin-flatwave-react/content/indexer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.resolve(projectRoot, 'dist');

async function prerender() {
  const options = {
    contentDir: path.resolve(projectRoot, 'src/content'),
    locales: ['es', 'pt'],
    defaultLocale: 'es',
    template: path.resolve(projectRoot, 'index.html'),
    ssrEntry: path.resolve(projectRoot, 'dist-ssr/entry-server.js'),
    prerender: true,
  };

  const index = await buildIndex(options);
  const prerenderer = await createPrerenderer(options, index);
  
  const results = await prerenderer.prerender(distDir);
  
  for (const { path: fileName, html } of results) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html);
  }
}

prerender();
```

### Run the Full Pipeline

```bash
npm run build      # client + SSR bundle
npm run prerender  # generates pre-rendered HTML in dist/
```

### Pre-rendered Output

Each route gets fully rendered HTML with:

- ✅ Complete React component tree (no empty `<div id="root">`)
- ✅ Markdown body rendered to HTML via `markdown-it`
- ✅ All SEO metadata (title, description, canonical, hreflang, Open Graph, Twitter, JSON-LD)
- ✅ Client-side hydration script with serialized page context
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

## Development Workflow (Monorepo)

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

## Running the React Example Locally (Without Docker)

```bash
# 1️⃣ Build the plugin (once)
npm run build:plugin

# 2️⃣ Start the example dev server
npm run dev -w @flatwave/example-basic-react-site
# → open http://localhost:8080
```

The example demonstrates:
- locale‑prefixed routes (`/es/`, `/pt/about`, …)  
- browser language detection redirect from `/`  
- `LanguageSwitcher` built from `getAlternatives()`  
- `react-markdown` rendering via `MarkdownRenderer`  
- SEO tags, `sitemap.xml`, `robots.txt`, `route-manifest.json` generated at build time
- **Build-time pre-rendering with full React hydration**
- **Client-side navigation without full page reloads**

---

## Docker‑Based Development & CI

The `docker/` folder contains a ready‑to‑run Compose stack.

```bash
# Build images and start dev server (hot-reload)
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

## Standalone Validation CLI

After building the plugin you get a binary `flatwave-validate`.

```bash
node packages/vite-plugin-flatwave-react/dist/cli/validate.js \
  --content-dir examples/basic-react-site/src/content \
  --locales es,pt \
  --default-locale es \
  --components-dir examples/basic-react-site/src/components \
  --strict-missing   # optional: turn missing‑locale warnings into errors
```

*Exit code 0* → validation passed (warnings printed to stderr).  
*Exit code 1* → errors found (or strict‑missing triggered).

The CLI re‑uses the exact same validator the Vite plugin runs at `buildStart`, guaranteeing parity between CI and local dev.

---

## Project Structure Recap

```
vite-plugin-flatwave-react/
├─ packages/vite-plugin-flatwave-react/
│   ├─ src/
│   │   ├─ index.ts                 # main plugin factory
│   │   ├─ content/                 # scanner, parser, validator, route builder, indexer
│   │   ├─ seo/                     # SEO metadata helpers
│   │   ├─ react/                   # React hooks over virtual content
│   │   ├─ render/                  # SINGLE render pipeline
│   │   │   ├─ types.ts             # RenderMode, SerializedPageContext, RenderControllerOptions
│   │   │   ├─ page.ts              # Pure route/content resolution
│   │   │   ├─ html.ts              # Template, assets, shell rendering, page-context injection
│   │   │   ├─ server.tsx           # SSR adapter: createPrerenderer(), component registry
│   │   │   ├─ client.tsx           # Browser adapter: startRenderLoop()
│   │   │   ├─ controller.tsx       # RenderController: owns hydration, navigation, head updates
│   │   │   ├─ navigation.ts        # Link interception, History API routing
│   │   │   └─ scroll-manager.ts    # Manual scroll save/restore
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
│   │   ├─ App.tsx / main.tsx       # render-loop integration
│   │   └─ styles.css
│   ├─ scripts/prerender.mjs        # pre-render script using createPrerenderer()
│   ├─ vite.config.ts
│   └─ package.json
├─ docker/                           # Compose + Dockerfiles + nginx
├─ e2e/example.test.ts              # Vitest end-to-end suite
├─ docs/
│   └─ ARCHITECTURE.md              # architecture documentation
└─ package.json                      # root workspace + helper scripts
```

---

## Contributing / Extending

1. **Add a new locale** – drop a folder under `src/content/<locale>/` and add the locale to `locales` in `vite.config.ts`.  
2. **New component** – create `src/components/MyComponent.tsx`, reference it in front‑matter (`component: "MyComponent"`).  
3. **Extra front‑matter** – any key not in the baseline list is kept in `attributes` and passed to the component; no schema changes required.  
4. **Custom SSG adapter** – the plugin emits a `route-manifest.json`; write a small script that reads it and renders HTML with your favourite framework (the built‑in SSG is a tiny Vite‑native static generator, but the inventory is adapter‑neutral).

---

## License

MIT © 2026 – Flatwave contributors.