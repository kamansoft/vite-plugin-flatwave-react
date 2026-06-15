# News Portal Example Site Proposal

## Overview

This document proposes the creation of a more complex example site (News Portal) demonstrating advanced features of `vite-plugin-flatwave-react`, including:
- Multi-type content (Posts, Categories, Pages)
- Category-to-post relationships via frontmatter slugs
- Build-time content processing pipeline using Strategy pattern
- Automatic JSON generation for navigation menus and category pages
- React component mapping for different content types

---

## 1. Current Plugin Architecture Summary

### Core Components
| Component | File | Purpose |
|-----------|------|---------|
| Plugin Factory | `src/index.ts` | Creates 3 Vite plugins, normalizes options, exposes virtual module |
| Scanner | `src/content/scanner.ts` | Discovers and parses Markdown files per locale |
| Indexer | `src/content/indexer.ts` | Builds normalized content entries and locale alternatives |
| Route Builder | `src/content/routeBuilder.ts` | Converts public entries to routes with SEO metadata |
| Validator | `src/content/validator.ts` | Validates frontmatter, duplicates, components, missing locales |
| SSG Plugin | `src/index.ts` (lines 73-111) | Emits static assets during `generateBundle` |

### Current Data Flow
```
Markdown Files → scanner → indexer → routeBuilder → FlatwaveContentIndex
                                                        ↓
Virtual Module (content helpers + full index) ← SSG Plugin (generateBundle)
                                                        ↓
                              route-manifest.json, sitemap.xml, robots.txt, HTML shells
```

### Current Limitations for News Portal
- No content-type distinction (all content treated equally)
- No relationship tracking between content (e.g., post → categories)
- No build-time processing pipeline for derived data
- No mechanism to generate auxiliary JSON files (menus, category indexes)
- No strategy pattern for extensible content processing

---

## 2. News Portal Requirements

### Content Types
| Type | Description | Frontmatter Fields |
|------|-------------|-------------------|
| **Post** | News article | `type: "post"`, `title`, `slug`, `id`, `component: "PostPage"`, `public`, `categories: string[]` (category slugs), `date`, `author`, `excerpt`, `featuredImage` |
| **Category** | Topic grouping | `type: "category"`, `title`, `slug`, `id`, `component: "CategoryPage"`, `public`, `description`, `menu: "main"`, `menu_position` |
| **Page** | Static content | `type: "page"`, `title`, `slug`, `id`, `component: "PageComponent"`, `public`, `menu`, `menu_position` |

### Relationships
- **Post → Categories**: Many-to-many via `categories: ["politics", "technology"]` in post frontmatter
- **Category → Posts**: Reverse lookup (derived at build time)
- **Page**: Standalone, no relationships

### Build-Time Derived Data
1. **Navigation Menu JSON** - Categories with `public: true` for `MainMenuNav` component
2. **Category Index JSON** - Per-category file with list of post IDs/slugs for `CategoryPage` component
3. **Post Archive JSON** - All posts sorted by date for archive pages

---

## 3. Proposed Architecture Changes

### 3.1 Content Processing Pipeline (Strategy Pattern)

Add a **content processing pipeline** that runs after indexer builds entries but before route builder creates routes. This allows plugins to:
- Transform entries
- Derive relationships
- Generate auxiliary files
- Register virtual modules for derived data

```typescript
// New type for content processors
interface ContentProcessor {
  name: string;
  priority: number; // Lower runs first
  process(entries: FlatwaveContentEntry[], index: FlatwaveContentIndex, options: FlatwaveContentOptions): 
    | Promise<FlatwaveContentEntry[]>
    | FlatwaveContentEntry[];
}

// Pipeline registration in plugin options
interface FlatwaveContentOptions {
  // ... existing options
  contentProcessors?: ContentProcessor[];
}
```

### 3.2 Built-in Processors (Core)

#### A. Category Relationship Processor
```typescript
const categoryRelationshipProcessor: ContentProcessor = {
  name: 'category-relationships',
  priority: 10,
  process(entries, index) {
    // Build category -> posts map
    const categoryMap = new Map<string, Set<string>>(); // categorySlug -> postIds
    
    for (const entry of entries) {
      if (entry.attributes.type === 'post' && entry.attributes.categories) {
        for (const catSlug of entry.attributes.categories) {
          if (!categoryMap.has(catSlug)) categoryMap.set(catSlug, new Set());
          categoryMap.get(catSlug)!.add(entry.id);
        }
      }
    }
    
    // Attach to entries
    for (const entry of entries) {
      if (entry.attributes.type === 'category') {
        entry.attributes.postIds = Array.from(categoryMap.get(entry.slug) || []);
      }
      if (entry.attributes.type === 'post') {
        entry.attributes.categoryEntries = entry.attributes.categories
          .map(slug => entries.find(e => e.slug === slug && e.attributes.type === 'category'))
          .filter(Boolean);
      }
    }
    
    // Store in index for virtual module access
    index.categoryPostMap = Object.fromEntries(
      Array.from(categoryMap.entries()).map(([k, v]) => [k, Array.from(v)])
    );
    
    return entries;
  }
};
```

#### B. Navigation Menu Processor
```typescript
const navigationMenuProcessor: ContentProcessor = {
  name: 'navigation-menu',
  priority: 20,
  process(entries, index) {
    const menuItems = entries
      .filter(e => e.attributes.type === 'category' && e.public)
      .sort((a, b) => Number(a.attributes.menu_position) - Number(b.attributes.menu_position))
      .map(e => ({
        id: e.id,
        title: e.attributes.title,
        slug: e.slug,
        locale: e.locale,
        route: e.route,
        description: e.attributes.description,
      }));
    
    index.navigationMenu = menuItems;
    return entries;
  }
};
```

#### C. Post Archive Processor
```typescript
const postArchiveProcessor: ContentProcessor = {
  name: 'post-archive',
  priority: 30,
  process(entries, index) {
    const posts = entries
      .filter(e => e.attributes.type === 'post' && e.public)
      .sort((a, b) => new Date(b.attributes.date).getTime() - new Date(a.attributes.date).getTime());
    
    index.postArchive = posts.map(p => ({
      id: p.id,
      title: p.attributes.title,
      slug: p.slug,
      locale: p.locale,
      route: p.route,
      date: p.attributes.date,
      excerpt: p.attributes.excerpt,
      categories: p.attributes.categories,
      featuredImage: p.attributes.featuredImage,
    }));
    
    return entries;
  }
};
```

### 3.3 Virtual Module Extensions

Extend `virtual:flatwave/content` to expose derived data:

```typescript
// Additional exports in createVirtualModule()
export function getNavigationMenu(locale?: string) { ... }
export function getCategoryPosts(categorySlug: string, locale?: string) { ... }
export function getPostArchive(locale?: string) { ... }
export function getCategoryPostMap() { ... }
export const flatwaveDerivedData = { navigationMenu, categoryPostMap, postArchive };
```

### 3.4 Auxiliary JSON File Generation

Add emission of JSON files during `generateBundle`:

```typescript
// In SSG plugin generateBundle hook
if (normalizedOptions.emitNavigationMenu !== false) {
  this.emitFile({
    type: 'asset',
    fileName: 'data/navigation-menu.json',
    source: JSON.stringify(index.navigationMenu, null, 2),
  });
}

if (normalizedOptions.emitCategoryIndexes !== false) {
  for (const [categorySlug, postIds] of Object.entries(index.categoryPostMap)) {
    const posts = postIds.map(id => index.byId[id]?.[locale]).filter(Boolean);
    this.emitFile({
      type: 'asset',
      fileName: `data/category-${categorySlug}.json`,
      source: JSON.stringify({ category: categorySlug, posts }, null, 2),
    });
  }
}

if (normalizedOptions.emitPostArchive !== false) {
  for (const locale of options.locales) {
    const localePosts = index.postArchive.filter(p => p.locale === locale);
    this.emitFile({
      type: 'asset',
      fileName: `data/post-archive-${locale}.json`,
      source: JSON.stringify(localePosts, null, 2),
    });
  }
}
```

### 3.5 New Configuration Options

```typescript
interface FlatwaveContentOptions {
  // ... existing options
  
  // Content processing
  contentProcessors?: ContentProcessor[];
  
  // Auxiliary JSON emission
  emitNavigationMenu?: boolean; // default: true
  emitCategoryIndexes?: boolean; // default: true
  emitPostArchive?: boolean; // default: true
  dataOutputDir?: string; // default: 'data'
  
  // Content type configuration
  contentTypes?: {
    post?: { typeField: 'type'; value: 'post'; requiredFields: string[] };
    category?: { typeField: 'type'; value: 'category'; requiredFields: string[] };
    page?: { typeField: 'type'; value: 'page'; requiredFields: string[] };
  };
}
```

---

## 4. News Portal Example Site Structure

### 4.1 Content Directory Layout
```
src/content/
  en/
    posts/
      breaking-news.md
      tech-update.md
      sports-victory.md
    categories/
      politics.md
      technology.md
      sports.md
    pages/
      about.md
      contact.md
      privacy.md
  es/
    posts/
      noticia-urgente.md
      actualizacion-tecnologica.md
      victoria-deportiva.md
    categorias/
      politica.md
      tecnologia.md
      deportes.md
    paginas/
      acerca.md
      contacto.md
      privacidad.md
```

### 4.2 Example Frontmatter

#### Category (src/content/en/categories/technology.md)
```yaml
---
title: "Technology"
slug: "technology"
id: "tech"
type: "category"
component: "CategoryPage"
public: true
description: "Latest technology news and updates"
menu: "main"
menu_position: 2
---
```

#### Post (src/content/en/posts/tech-update.md)
```yaml
---
title: "Major Tech Update Released"
slug: "tech-update"
id: "tech-update-001"
type: "post"
component: "PostPage"
public: true
date: "2026-01-15"
author: "Jane Doe"
excerpt: "A comprehensive overview of the latest technology updates."
featuredImage: "/images/tech-update.jpg"
categories: ["technology"]
---
```

#### Page (src/content/en/pages/about.md)
```yaml
---
title: "About Us"
slug: "about"
id: "about"
type: "page"
component: "SimplePage"
public: true
menu: "main"
menu_position: 1
---
```

---

## 5. React Components Structure

### 5.1 Component Mapping
```
src/components/
  PostPage.tsx         # Renders individual post
  CategoryPage.tsx     # Renders category with post list
  SimplePage.tsx       # Renders static pages
  MainMenuNav.tsx      # Navigation menu (uses navigation-menu.json)
  PostArchive.tsx      # Archive page (uses post-archive.json)
  PostCard.tsx         # Reusable post preview card
```

### 5.2 Data Access Patterns

```typescript
// MainMenuNav.tsx - uses virtual module
import { getNavigationMenu } from 'virtual:flatwave/content';

export function MainMenuNav({ locale }) {
  const menu = getNavigationMenu(locale);
  return <nav>{menu.map(item => <Link key={item.id} to={item.route}>{item.title}</Link>)}</nav>;
}

// CategoryPage.tsx - uses virtual module  
import { getCategoryPosts } from 'virtual:flatwave/content';

export function CategoryPage({ content }) {
  const posts = getCategoryPosts(content.slug, content.locale);
  return (
    <section>
      <h1>{content.attributes.title}</h1>
      <div className="post-grid">
        {posts.map(post => <PostCard key={post.id} post={post} />)}
      </div>
    </section>
  );
}

// PostPage.tsx
import { getContent } from 'virtual:flatwave/content';

export function PostPage({ content }) {
  const relatedPosts = content.attributes.categoryEntries?.flatMap(cat => 
    getCategoryPosts(cat.slug, content.locale).filter(p => p.id !== content.id)
  ) ?? [];
  
  return (
    <article>
      <header>
        <h1>{content.attributes.title}</h1>
        <time>{content.attributes.date}</time>
      </header>
      <MarkdownRenderer>{content.body}</MarkdownRenderer>
      <aside>
        <h2>Related Posts</h2>
        {relatedPosts.slice(0, 3).map(p => <PostCard key={p.id} post={p} />)}
      </aside>
    </article>
  );
}
```

---

## 6. Implementation Plan

### Phase 1: Core Plugin Extensions
1. **Add ContentProcessor interface** to types.ts
2. **Add contentProcessors option** to FlatwaveContentOptions
3. **Implement pipeline execution** in indexer.ts after buildContentEntry, before buildContentIndex
4. **Extend FlatwaveContentIndex** with derived data fields (navigationMenu, categoryPostMap, postArchive)
5. **Add built-in processors** (category-relationships, navigation-menu, post-archive)
6. **Extend virtual module** with new helper functions

### Phase 2: JSON Emission
1. **Add emit options** to FlatwaveContentOptions
2. **Implement JSON emission** in SSG plugin generateBundle hook
3. **Add dataOutputDir option** for custom output directory

### Phase 3: Validation Enhancements
1. **Add content type validation** in validator.ts
2. **Validate category slugs exist** for post.categories
3. **Validate component mapping** per content type

### Phase 4: Example Site Implementation
1. **Create content directory structure** with sample posts, categories, pages
2. **Implement React components** (PostPage, CategoryPage, MainMenuNav, PostArchive, PostCard)
3. **Configure vite.config.ts** with new options
4. **Add TypeScript types** for derived data in virtual.d.ts
5. **Test build and verify outputs**

### Phase 5: Documentation
1. **Document new content types** and frontmatter fields
2. **Document content processor API** for custom processors
3. **Document virtual module extensions**
4. **Document JSON output structure**

---

## 7. Technical Considerations

### 7.1 Backward Compatibility
- All new options are optional with sensible defaults
- Existing sites continue to work without changes
- Processors only run when explicitly configured

### 7.2 Performance
- Processors run once at build time (and on HMR for .md changes)
- Derived data computed in-memory, no redundant file I/O
- JSON emission only for enabled options

### 7.3 Type Safety
- New TypeScript interfaces for derived data
- Virtual module declaration updated (virtual.d.ts)
- ContentProcessor interface enables typed custom processors

### 7.4 Extensibility
- Users can add custom ContentProcessors
- Priority system controls execution order
- Processors receive full index for cross-referencing

---

## 8. Alternative Approaches Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Separate Vite plugin** | Isolated, independent | Complex setup, duplicate scanning | Rejected - tightly coupled to content index |
| **Rollup output plugin** | Access to full bundle | Too late for virtual module updates | Rejected - need data before generateBundle |
| **Content processor pipeline** | Integrated, flexible, type-safe | Requires core changes | **Selected** - best integration |
| **Frontmatter-only conventions** | No plugin changes | Limited, no derived data, no JSON emission | Rejected - insufficient for requirements |

---

## 9. Open Questions

1. **Category slug normalization**: Should category slugs be locale-prefixed or global?
   - Recommendation: Global slugs (no locale prefix), locale handled via content locale

2. **Multi-locale category index**: Generate one JSON per locale or combined?
   - Recommendation: Per-locale JSON files (e.g., `data/category-technology-en.json`)

3. **Processor execution timing**: Should processors run during dev server HMR?
   - Recommendation: Yes, for live preview of derived data

4. **Custom processor discovery**: Auto-discover from componentsDir or explicit registration?
   - Recommendation: Explicit registration via options for clarity

5. **Default content types**: Should post/category/page be built-in or user-defined?
   - Recommendation: Built-in defaults with override capability

---

## 10. Validation & Testing Strategy

### Build-Time Validation
- All required frontmatter fields per content type
- Post categories reference existing category slugs
- No duplicate IDs within content type + locale
- Component exists for each content type

### Output Verification
- route-manifest.json contains all public routes
- navigation-menu.json matches expected structure
- category-*.json files exist for each public category
- post-archive-*.json contains sorted posts
- HTML shells reference correct component names

### Runtime Testing
- MainMenuNav renders correct links per locale
- CategoryPage displays correct posts
- PostPage shows related posts from same categories
- Language switching works for all content types

---

## 11. Summary

This proposal extends `vite-plugin-flatwave-react` with a **content processing pipeline** using the **Strategy pattern** to enable:

1. **Content type awareness** (post, category, page)
2. **Relationship derivation** (post ↔ category)
3. **Build-time data generation** (navigation menu, category indexes, post archive)
4. **JSON asset emission** for client-side consumption
5. **Extensible processor architecture** for custom use cases

The News Portal example will demonstrate these capabilities while maintaining full backward compatibility with existing sites.