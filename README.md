# vite-plugin-flatwave-react

A Vite plugin for **Markdown‑driven, i18n‑aware static React sites**.  
It scans Markdown files with front‑matter, builds a typed content index, exposes virtual modules for the client, generates locale‑prefixed static HTML, sitemap, robots.txt and route manifest, and provides a validation CLI.

> **Note:** The package is not yet published on npmjs. The instructions below show how to use it from the repository checkout.

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
    }),
  ],
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
* SEO tags, `sitemap.xml`, `robots.txt`, `route-manifest.json` generated at build time.

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
  --components-dir examples/basic-react-site/src/components \
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
│   │   ├─ cli/validate.ts          # flatwave-validate entry point
│   │   └─ virtual.d.ts             # TypeScript declarations for virtual modules
│   ├─ tsconfig.build.json
│   └─ package.json
├─ examples/basic-react-site/        # minimal React + Vite consumer
│   ├─ src/
│   │   ├─ content/{es,pt}/*.md
│   │   ├─ components/*.tsx
│   │   ├─ App.tsx / main.tsx
│   │   └─ styles.css
│   ├─ vite.config.ts
│   └─ package.json
├─ docker/                           # Compose + Dockerfiles + nginx
├─ e2e/example.test.ts              # Vitest end‑to‑end suite
├─ docs/                             # design & requirements documents
└─ package.json                      # root workspace + helper scripts
```

---

## Contributing / extending

1. **Add a new locale** – drop a folder under `src/content/<locale>/` and add the locale to `locales` in `vite.config.ts`.  
2. **New component** – create `src/components/MyComponent.tsx`, reference it in front‑matter (`component: "MyComponent"`).  
3. **Extra front‑matter** – any key not in the baseline list is kept in `attributes` and passed to the component; no schema changes required.  
4. **Custom SSG adapter** – the plugin emits a `route-manifest.json`; write a small script that reads it and renders HTML with your favourite framework (the built‑in SSG is a tiny Vite‑native static generator, but the inventory is adapter‑neutral).

---

## License

MIT © 2026 – Flatwave contributors.