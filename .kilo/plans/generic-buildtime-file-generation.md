# Generic Build-Time File Generation System

## Overview

This proposal extends `vite-plugin-flatwave-react` with a **generic build-time file generation system** using the **Strategy pattern**. The goal is to make the plugin adaptable to any site type (news portal, product catalog, restaurant menu, documentation site, etc.) by allowing sites to define custom strategies that analyze the full content set and emit arbitrary files during build.

The core insight: **different sites need different derived data**. A news portal needs category→post indexes and navigation menus. A product catalog needs category trees, attribute filters, and search indexes. A restaurant menu needs dietary tags, allergen maps, and daily specials. The plugin should provide the **framework**, sites provide the **strategies**, and the plugin comes with **built-in strategies as examples**.

---

## 1. Current Architecture Recap

| Component | File | Purpose |
|-----------|------|---------|
| Plugin Factory | `src/index.ts` | Creates 3 Vite plugins, normalizes options, virtual module |
| Scanner | `src/content/scanner.ts` | Discovers/parses Markdown per locale |
| Indexer | `src/content/indexer.ts` | Builds normalized entries + locale alternatives |
| Route Builder | `src/content/routeBuilder.ts` | Converts public entries to routes + SEO |
| Validator | `src/content/validator.ts` | Validates frontmatter, duplicates, components |
| SSG Plugin | `src/index.ts:73-111` | Emits static assets in `generateBundle` |

**Current gap**: No extensible way to derive cross-content relationships or emit custom files.

---

## 2. Core Concept: Build-Time Generation Strategies

### Strategy Interface

```typescript
// packages/vite-plugin-flatwave-react/src/types.ts

export interface BuildGenerationContext {
  /** All content entries (all locales, indexed by ID then locale) */
  entries: FlatwaveContentEntry[];
  /** Index grouped by ID -> locale -> entry */
  byId: Record<string, Record<string, FlatwaveContentEntry>>;
  /** Index grouped by locale -> ID -> entry */
  byLocale: Record<string, Record<string, FlatwaveContentEntry>>;
  /** Public routes (subset of entries) */
  routes: FlatwaveRoute[];
  /** Plugin options for reference */
  options: FlatwaveContentOptions;
  /** Virtual module helpers (getContent, getRoutes, etc.) */
  virtualModule: VirtualModuleAPI;
  /** Shared mutable store for cross-strategy communication */
  shared: Map<string, unknown>;
  /** Emit a file during build (delegates to Rollup/Vite) */
  emitFile: (file: EmittedFile) => void;
}

export interface EmittedFile {
  fileName: string;           // Output path relative to dist root
  source: string | Uint8Array; // File content
  type?: 'asset' | 'chunk';   // Rollup asset type
  /** Optional: also expose via virtual module */
  virtualExport?: {
    name: string;             // Export name in virtual module
    getter: () => unknown;    // Lazy getter for the data
  };
}

export interface BuildGenerationStrategy {
  /** Unique identifier */
  name: string;
  /** Execution order (lower runs first) */
  priority: number;
  /** 
   * Process the full content set and optionally emit files.
   * Return value is stored in context.shared for other strategies.
   */
  execute(context: BuildGenerationContext): Promise<unknown> | unknown;
  
  /** Optional: declare virtual module exports this strategy provides */
  virtualExports?: VirtualExport[];
  
  /** Optional: configuration schema for user options */
  configSchema?: Record<string, unknown>;
}

export interface VirtualExport {
  name: string;
  getter: (context: BuildGenerationContext) => unknown;
}
```

### Plugin Options Extension

```typescript
// In FlatwaveContentOptions
interface FlatwaveContentOptions {
  // ... existing options
  
  /** Custom strategies provided by the site */
  generationStrategies?: BuildGenerationStrategy[];
  
  /** Enable/disable built-in strategies */
  builtinStrategies?: {
    /** Generate navigation menu from 'menu' frontmatter */
    navigationMenu?: boolean | NavigationMenuStrategyOptions;
    /** Generate category->entries indexes */
    categoryIndex?: boolean | CategoryIndexStrategyOptions;
    /** Generate search index (JSON) */
    searchIndex?: boolean | SearchIndexStrategyOptions;
    /** Generate sitemap additions */
    sitemapExtensions?: boolean;
  };
  
  /** Output directory for generated files (default: 'data') */
  generatedDataDir?: string;
}
```

---

## 3. Built-In Strategies (Examples)

The plugin ships with these **opt-in** strategies as demonstrations:

### 3.1 NavigationMenuStrategy
Generates `data/navigation-menu.json` from entries with `menu` frontmatter.
```typescript
// Options
interface NavigationMenuStrategyOptions {
  /** Frontmatter field for menu name (default: 'menu') */
  menuField?: string;
  /** Frontmatter field for position (default: 'menu_position') */
  positionField?: string;
  /** Filter predicate (default: public entries with menu field) */
  filter?: (entry: FlatwaveContentEntry) => boolean;
  /** Transform entry to menu item */
  mapItem?: (entry: FlatwaveContentEntry) => NavigationMenuItem;
}
```

### 3.2 CategoryIndexStrategy
Generates `data/category-{slug}.json` for each unique category value.
```typescript
// Options
interface CategoryIndexStrategyOptions {
  /** Frontmatter field containing category slugs (default: 'categories') */
  categoryField?: string;
  /** Whether to group by locale (default: true) */
  groupByLocale?: boolean;
  /** Include full entry data or just references */
  includeFullEntries?: boolean;
}
```

### 3.3 SearchIndexStrategy
Generates `data/search-index.json` for client-side search.
```typescript
// Options
interface SearchIndexStrategyOptions {
  /** Fields to include in search index */
  fields?: string[];
  /** Whether to include content body */
  includeBody?: boolean;
  /** Locale handling */
  perLocale?: boolean;
}
```

### 3.4 RelatedContentStrategy
Generates `data/related-{contentId}.json` for "related posts" features.
```typescript
// Options
interface RelatedContentStrategyOptions {
  /** Algorithm: 'shared-categories' | 'shared-tags' | 'same-author' | custom function */
  algorithm?: 'shared-categories' | 'shared-tags' | 'same-author' | ((entry, allEntries) => string[]);
  /** Max related items per entry */
  maxResults?: number;
}
```

---

## 4. Execution Flow

```
Vite Build Start
      │
      ▼
┌─────────────────────────────────────┐
│ flatwave-react:content (buildStart) │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ 1. Scan markdown files (scanner)    │
│ 2. Build content entries (indexer)  │
│ 3. Build route index (routeBuilder) │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ BuildGenerationContext created      │
│ - entries, byId, byLocale, routes   │
│ - emitFile() bound to Vite          │
│ - shared Map for cross-strategy     │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ Execute strategies by priority      │
│   for (strategy of strategies) {    │
│     await strategy.execute(ctx)     │
│     ctx.shared.set(name, result)    │
│   }                                 │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ Virtual module generated with:      │
│ - Standard helpers                  │
│ - Strategy virtualExports           │
│ - flatwaveGeneratedData object      │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ flatwave-react:ssg (generateBundle) │
│ - Emits standard assets             │
│ - Generated files already emitted   │
└─────────────────────────────────────┘
```

---

## 5. Virtual Module API Extensions

```typescript
// Generated virtual module includes:

// Standard helpers (existing)
export function getContent(id: string, locale?: string): FlatwaveContentEntry | undefined;
export function getAllContent(): FlatwaveContentEntry[];
export function getRoutes(locale?: string): FlatwaveRoute[];
export function getAlternatives(contentId: string, currentLocale: string): Record<string, string>;
export function getLocales(): string[];
export function getDefaultLocale(): string;

// Strategy-provided exports (dynamic)
export function getNavigationMenu(locale?: string): NavigationMenuItem[];
export function getCategoryIndex(categorySlug: string, locale?: string): CategoryIndexData;
export function getSearchIndex(locale?: string): SearchIndexEntry[];
export function getRelatedContent(contentId: string, locale?: string): RelatedContentItem[];

// Raw generated data object
export const flatwaveGeneratedData: {
  navigationMenu?: NavigationMenuItem[];
  categoryIndexes?: Record<string, CategoryIndexData>;
  searchIndex?: SearchIndexEntry[];
  relatedContent?: Record<string, RelatedContentItem[]>;
  [strategyName: string]: unknown;
};
```

---

## 6. Site Implementation Example

### 6.1 News Portal (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { flatwaveContent } from 'vite-plugin-flatwave-react';
import path from 'node:path';

// Custom strategy for news portal
const breakingNewsStrategy: BuildGenerationStrategy = {
  name: 'breaking-news-banner',
  priority: 5,
  execute(ctx) {
    const breaking = ctx.entries
      .filter(e => e.attributes.type === 'post' && e.attributes.breaking === true)
      .sort((a, b) => new Date(b.attributes.date).getTime() - new Date(a.attributes.date).getTime())
      .slice(0, 3);
    
    ctx.emitFile({
      fileName: 'data/breaking-news.json',
      source: JSON.stringify(breaking, null, 2),
    });
    
    ctx.shared.set('breakingNews', breaking);
  },
  virtualExports: [{
    name: 'getBreakingNews',
    getter: (ctx) => (locale?: string) => 
      (ctx.shared.get('breakingNews') as FlatwaveContentEntry[])
        ?.filter(e => !locale || e.locale === locale) ?? []
  }]
};

export default defineConfig({
  plugins: [
    react(),
    flatwaveContent({
      contentDir: path.resolve(__dirname, 'src/content'),
      locales: ['en', 'es'],
      defaultLocale: 'en',
      componentsDir: path.resolve(__dirname, 'src/components'),
      generatedDataDir: 'data',
      
      // Enable built-in strategies with custom options
      builtinStrategies: {
        navigationMenu: {
          menuField: 'menu',
          positionField: 'menu_position',
        },
        categoryIndex: {
          categoryField: 'categories',
          groupByLocale: true,
        },
        searchIndex: {
          fields: ['title', 'excerpt', 'categories', 'tags'],
          includeBody: false,
        }
      },
      
      // Add custom strategies
      generationStrategies: [breakingNewsStrategy],
    })
  ]
});
```

### 6.2 Product Catalog (`vite.config.ts`)

```typescript
const catalogStrategies: BuildGenerationStrategy[] = [
  {
    name: 'attribute-filters',
    priority: 10,
    execute(ctx) {
      // Extract all unique attribute values across products
      const products = ctx.entries.filter(e => e.attributes.type === 'product');
      const attributes = new Map<string, Set<string>>();
      
      for (const p of products) {
        for (const [key, value] of Object.entries(p.attributes.attributes || {})) {
          if (!attributes.has(key)) attributes.set(key, new Set());
          attributes.get(key)!.add(String(value));
        }
      }
      
      const filterData = Object.fromEntries(
        Array.from(attributes.entries()).map(([k, v]) => [k, Array.from(v).sort()])
      );
      
      ctx.emitFile({
        fileName: 'data/attribute-filters.json',
        source: JSON.stringify(filterData, null, 2),
      });
    },
    virtualExports: [{
      name: 'getAttributeFilters',
      getter: (ctx) => () => ctx.shared.get('attributeFilters')
    }]
  },
  {
    name: 'category-tree',
    priority: 15,
    execute(ctx) {
      // Build hierarchical category tree from flat categories
      const categories = ctx.entries.filter(e => e.attributes.type === 'category');
      const tree = buildCategoryTree(categories);
      
      ctx.emitFile({
        fileName: 'data/category-tree.json',
        source: JSON.stringify(tree, null, 2),
      });
    }
  }
];

// In flatwaveContent config:
generationStrategies: catalogStrategies,
builtinStrategies: {
  navigationMenu: false,  // Use custom category-tree instead
  searchIndex: { fields: ['name', 'description', 'sku', 'attributes'] }
}
```

### 6.3 Restaurant Menu (`vite.config.ts`)

```typescript
const restaurantStrategies: BuildGenerationStrategy[] = [
  {
    name: 'allergen-map',
    priority: 10,
    execute(ctx) {
      const dishes = ctx.entries.filter(e => e.attributes.type === 'dish');
      const allergenMap = new Map<string, string[]>(); // allergen -> dish IDs
      
      for (const dish of dishes) {
        for (const allergen of dish.attributes.allergens || []) {
          if (!allergenMap.has(allergen)) allergenMap.set(allergen, []);
          allergenMap.get(allergen)!.push(dish.id);
        }
      }
      
      ctx.emitFile({
        fileName: 'data/allergen-map.json',
        source: JSON.stringify(Object.fromEntries(allergenMap), null, 2),
      });
    }
  },
  {
    name: 'daily-specials',
    priority: 20,
    execute(ctx) {
      const today = new Date().toISOString().split('T')[0];
      const specials = ctx.entries.filter(e => 
        e.attributes.type === 'dish' && 
        e.attributes.specialDate === today
      );
      
      ctx.emitFile({
        fileName: 'data/daily-specials.json',
        source: JSON.stringify(specials, null, 2),
      });
    }
  }
];
```

---

## 7. Implementation Plan

### Phase 1: Core Framework
1. Add `BuildGenerationStrategy`, `BuildGenerationContext`, `EmittedFile` types to `types.ts`
2. Add `generationStrategies`, `builtinStrategies`, `generatedDataDir` to `FlatwaveContentOptions`
3. Create `src/content/generationPipeline.ts` with `executeGenerationStrategies(context)` function
4. Call pipeline in `indexer.ts` after `buildContentIndex`, before returning index
5. Extend `createVirtualModule` in `index.ts` to include strategy virtual exports
6. Ensure `emitFile` in context delegates to Vite's `this.emitFile` (available in `generateBundle`)

### Phase 2: Built-In Strategies
1. Create `src/strategies/` directory
2. Implement `NavigationMenuStrategy`, `CategoryIndexStrategy`, `SearchIndexStrategy`, `RelatedContentStrategy`
3. Register built-ins in plugin factory when `builtinStrategies` options enabled
4. Add TypeScript types for each strategy's options

### Phase 3: Integration & Emission
1. In SSG plugin `generateBundle`, ensure strategy-emitted files are written
2. Handle `virtualExport` - add getters to virtual module
3. Add `generatedDataDir` option support (prefix all emitted fileNames)

### Phase 4: Validation & Dev Experience
1. Validate strategy names are unique
2. Validate priority ordering doesn't create conflicts
3. Add HMR support: re-run strategies on content change
4. Add TypeScript types for virtual module exports (update `virtual.d.ts`)

### Phase 5: Example Sites
1. **News Portal** - demonstrates navigationMenu, categoryIndex, searchIndex, custom breakingNews
2. **Product Catalog** - demonstrates attribute-filters, category-tree, custom searchIndex config
3. **Documentation Site** - demonstrates sidebar generation, version index, API reference index

### Phase 6: Documentation
1. Strategy authoring guide
2. Built-in strategies reference
3. Virtual module API reference
4. Migration guide from hardcoded processors

---

## 8. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Strategies run after indexer, before routeBuilder | Full content index available, routes not yet finalized |
| `emitFile` in context delegates to Vite | Single emission point, integrates with Vite's asset pipeline |
| `shared` Map for cross-strategy data | Allows strategies to build on each other (e.g., categoryIndex → relatedContent) |
| Virtual exports declared upfront | Type-safe virtual module generation |
| Built-in strategies opt-in | Zero impact on existing sites, explicit opt-in |
| Priority-based execution | Deterministic ordering, dependencies via priority |
| Per-site strategy definition | Strategies are site-specific logic, not plugin internals |

---

## 9. Backward Compatibility

- All new options are optional
- Existing sites work unchanged (no strategies = no extra files)
- Virtual module only adds exports when strategies provide them
- No breaking changes to existing hooks or APIs

---

## 10. Open Questions

1. **Strategy discovery**: Should strategies be discoverable from a directory (e.g., `src/strategies/`) or only explicit in config? → Explicit in config for clarity.

2. **Dev server HMR**: Re-run all strategies on content change, or only affected? → Start with full re-run for simplicity.

3. **Type-safe strategy config**: Use Zod/JSON Schema for `configSchema` to validate user options? → Phase 2, start with TypeScript interfaces.

4. **Strategy dependencies**: Explicit `dependsOn: string[]` vs priority-only? → Priority-only for v1, explicit deps if needed.

5. **Virtual module types**: Generate `.d.ts` dynamically or use declaration merging? → Declaration merging via module augmentation.

---

## 11. Summary

This proposal replaces the news-portal-specific "content processors" with a **generic build-time generation framework**:

- **Framework**: Strategy interface, execution pipeline, context, virtual module integration
- **Built-ins**: Navigation menu, category index, search index, related content (as examples)
- **Custom**: Sites define their own strategies for any file generation need
- **Generic**: Works for news, catalogs, menus, docs, portfolios, directories, etc.

The News Portal becomes **one example** of using the framework, not the driver of the design.