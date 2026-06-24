# 🌊 vite-plugin-flatwave-react

[![npm version](https://img.shields.io/npm/v/@kamansoft/vite-plugin-flatwave-react?style=flat-square&color=61DAFB)](https://www.npmjs.com/package/@kamansoft/vite-plugin-flatwave-react)
[![npm downloads](https://img.shields.io/npm/dw/@kamansoft/vite-plugin-flatwave-react?style=flat-square&color=4FC08D)](https://www.npmjs.com/package/@kamansoft/vite-plugin-flatwave-react)
[![CI status](https://img.shields.io/github/actions/workflow/status/kamansoft/vite-plugin-flatwave-react/ci.yml?branch=main&style=flat-square&logo=githubactions)](https://github.com/kamansoft/vite-plugin-flatwave-react/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/kamansoft/vite-plugin-flatwave-react?style=flat-square&color=F7DF1E)](./LICENSE)
[![Node.js version](https://img.shields.io/node/v/@kamansoft/vite-plugin-flatwave-react?style=flat-square&logo=nodedotjs&color=339933)](https://nodejs.org/en/about/releases/)
[![Discord](https://img.shields.io/badge/chat-discord-7289DA?style=flat-square&logo=discord)](https://discord.gg/vite)

> **Turn Markdown into a fully-typed, i18n-ready, static React site — zero runtime, no MDX, no server.**
>
> Works in **any Vite + React project**. Drop it in, point to your content folder, done.

---

## ✨ Why Flatwave?

| Problem                              | Flatwave Solution                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| MDX locks you into custom components | **Pure Markdown** — use any React component via virtual module                                    |
| i18n is an afterthought              | **First-class i18n** — locale routes (`/en/about`, `/es/about`), auto hreflang, language switcher |
| TypeScript support is partial        | **Fully typed** — virtual module + React hooks with full IntelliSense                             |
| SSG requires complex config          | **Zero-config SSG** — static HTML at build, deploy to Netlify, Vercel, S3, GitHub Pages, Nginx    |
| Content validation is manual         | **Built-in validation** — catches missing fields, duplicate IDs, broken links at build time       |

---

## 🚀 Quick Start (30 seconds)

```bash
# 1. Install
npm install @kamansoft/vite-plugin-flatwave-react

# 2. Add to vite.config.ts
import { flatwaveContent } from '@kamansoft/vite-plugin-flatwave-react';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    flatwaveContent({
      contentDir: path.resolve(__dirname, 'src/content'),
      locales: ['en', 'es'],
      defaultLocale: 'en',
    }),
  ],
});

# 3. Create content
mkdir -p src/content/en
cat > src/content/en/index.md <<'EOF'
---
title: 'Welcome'
slug: ''
id: 'home'
public: true
description: 'My first Flatwave page'
---
# Hello Flatwave! 🌊

This is **pure Markdown** — no MDX, no custom components needed.
EOF

# 4. Run dev server
npm run dev
```

Open `http://localhost:5173/en/` — your page is live with hot reload! 🎉

---

## 🎯 Two Ways to Use It

### Mode 1: Composable (Recommended for Existing React Apps)

Use the **virtual module hooks** + **components** in your existing React Router setup:

```tsx
// src/pages/[id].tsx
import { getContent, getAlternatives } from 'virtual:flatwave/content';
import { FlatwaveMDPageComponent } from '@kamansoft/vite-plugin-flatwave-react/react';
import Layout from '../components/Layout';

export default function Page({ params }: { params: { id: string } }) {
  const { id } = params;
  const locale = import.meta.env.VITE_CURRENT_LOCALE || 'en';

  const content = getContent(id, locale);
  const alternatives = getAlternatives(id, locale);

  if (!content) return <div>404 - Not Found</div>;

  return (
    <Layout locale={locale} alternatives={alternatives}>
      <FlatwaveMDPageComponent
        frontmatter={content.frontmatter}
        markdownHtml={content.body}
        locale={locale}
      />
    </Layout>
  );
}
```

**React hooks** for use anywhere in your components:

```tsx
import {
  useFlatwaveContent, // Get single content entry
  useFlatwaveRoutes, // Get all routes (optionally filtered by locale)
  useFlatwaveAlternatives, // Get locale alternatives for language switcher
  useFlatwaveLocales, // Get all configured locales
} from '@kamansoft/vite-plugin-flatwave-react/react';

function BlogPost({ id, locale }) {
  const post = useFlatwaveContent(id, locale);
  const alternatives = useFlatwaveAlternatives(id, locale);
  const locales = useFlatwaveLocales();

  if (!post) return <div>Loading...</div>;

  return (
    <article>
      <h1>{post.frontmatter.title}</h1>
      <nav>
        {Object.entries(alternatives).map(([lang, path]) => (
          <a key={lang} href={path}>
            {lang.toUpperCase()}
          </a>
        ))}
      </nav>
      <FlatwaveMDComponent
        frontmatter={post.frontmatter}
        markdownHtml={post.body}
        locale={locale}
      />
    </article>
  );
}
```

### Mode 2: Integrated (Zero-Config Routing + i18n)

Let Flatwave handle **routing, language detection, and rendering** automatically:

```tsx
// src/App.tsx
import {
  FlatwaveLanguageRouter,
  FlatwaveMDPageComponent,
  useFlatwaveRoutes,
  useFlatwaveContent,
} from '@kamansoft/vite-plugin-flatwave-react/react';

export function App() {
  const routes = useFlatwaveRoutes();

  return (
    <FlatwaveLanguageRouter
      supportedLanguages={['en', 'es']}
      defaultLanguage="en"
      routes={routes}
      renderPage={(route, lang) => {
        const content = useFlatwaveContent(route.contentId, lang);
        return (
          <FlatwaveMDPageComponent
            frontmatter={content?.frontmatter}
            markdownHtml={content?.body}
            locale={lang}
          />
        );
      }}
    />
  );
}
```

**That's it.** You get:

- Auto locale detection from browser language
- Locale-prefixed routes (`/en/about`, `/es/about`)
- Language switcher component built-in
- SEO meta tags from frontmatter

---

## 📁 Content Structure

```
src/
└── content/
    ├── en/
    │   ├── index.md        # → /en/
    │   ├── about.md        # → /en/about
    │   └── blog/
    │       └── hello.md    # → /en/blog/hello
    └── es/
        ├── index.md        # → /es/
        ├── about.md        # → /es/about
        └── blog/
            └── hello.md    # → /es/blog/hello
```

**Frontmatter (required fields):**

```yaml
---
title: 'About Us' # Page title → <title>, <h1>, og:title
slug: 'about' # URL segment → /{locale}/about
id: 'about' # Groups translations (same across locales)
public: true # false = hidden from routes, sitemap, manifest
description: 'Short desc' # meta description, og:description
canonical: '/en/about' # Optional, defaults to /{locale}/{slug}
robots: 'index, follow' # Default: index, follow

# SEO Extras
og:
  title: 'Custom OG Title'
  image: '/images/og-about.png'
twitter:
  card: 'summary_large_image'
jsonLd:
  '@context': 'https://schema.org'
  '@type': 'WebPage'

# Navigation
menu: 'main' # 'main' | 'footer' | custom
menu_position: 2 # Sort order in menus

# Any extra keys → preserved in `attributes`
custom_field: 'value'
---
Your markdown content here...
```

---

## ⚙️ Configuration

```typescript
flatwaveContent({
  // Required
  contentDir: './src/content', // Where .md files live
  locales: ['en', 'es', 'pt'], // All supported locales
  defaultLocale: 'en', // Must be in locales[]

  // Validation
  strictMissingLocales: false, // true → missing locale = build error
  requiredFields: ['title', 'slug', 'id', 'public'],

  // SSG (enabled by default)
  ssg: {
    enabled: true,
    compileMarkdown: {
      allowRawHtml: false, // Allow raw HTML in markdown
      remarkPlugins: [], // Custom remark plugins
      rehypePlugins: [], // Custom rehype plugins
    },
    hooks: {
      beforeRender: async (ctx) => {
        /* inject data */
      },
      transformMarkdown: async (md, ctx) => {
        /* pre-process */
      },
      transformHtml: async (html, ctx) => {
        /* post-process */
      },
      afterRender: async (html, ctx) => {
        /* side effects */
      },
      onError: async (err, ctx) => {
        /* fallback HTML */
      },
    },
    strategy: new DefaultRenderStrategy(), // Or custom RenderStrategy
  },

  // SEO
  sitemap: {
    hostname: 'https://mysite.com', // Required for sitemap.xml
  },

  // Output
  emitRouteManifest: true, // route-manifest.json
  emitSitemap: true, // sitemap.xml
  emitRobotsTxt: true, // robots.txt
});
```

---

## 🔄 Migration from MDX / Next.js / Astro

| Feature         | MDX / Next.js / Astro | Flatwave                                |
| --------------- | --------------------- | --------------------------------------- |
| **Markdown**    | Standard + JSX        | ✅ Standard only                        |
| **Components**  | Import in `.mdx`      | ✅ Via virtual module + your components |
| **i18n**        | Plugin/config heavy   | ✅ Zero-config, locale-first            |
| **Types**       | Partial / manual      | ✅ Full TypeScript from virtual module  |
| **SSG**         | Framework-dependent   | ✅ `react-dom/server` — deploy anywhere |
| **Bundle size** | Includes runtime      | ✅ **Zero runtime dependencies**        |
| **Validation**  | Manual / runtime      | ✅ Build-time, fail-fast                |

---

## 📚 Documentation

| Guide                                                    | Description                                                      |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| 📐 [Architecture](./docs/Architecture.md)                | System design, module breakdown, Mermaid diagrams, type system   |
| 🛠️ [Development](./docs/DEVELOPMENT.md)                  | Coding standards, Docker, Husky, Git workflow, local npm linking |
| 🚀 [CI/CD & Release](./docs/ci-cd-release-automation.md) | Semantic-release, OIDC publishing, GitHub Actions pipeline       |
| 🔧 [API Reference](./docs/API.md)                        | Complete TypeScript API for virtual module, hooks, SSG, config   |

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md).

**Quick checklist for PRs:**

- [ ] Conventional Commit title (`feat:`, `fix:`, `chore:`, etc.)
- [ ] `npm run validate` passes (format + lint + type-check + build + test)
- [ ] Tests added for new features

---

## 📄 License

[MIT](./LICENSE) © [KamanaSoft](https://github.com/kamansoft)

---

## 💬 Community & Support

- 🐛 [Issue Tracker](https://github.com/kamansoft/vite-plugin-flatwave-react/issues) — Bug reports & feature requests
- 💡 [Discussions](https://github.com/kamansoft/vite-plugin-flatwave-react/discussions) — Questions, ideas, showcases
- 💬 [Discord](https://discord.gg/vite) — Real-time chat with the Vite community

---

_Built with ❤️ for React developers who love Markdown and static sites._

_If this project helps you, please consider giving it a ⭐ on GitHub!_
