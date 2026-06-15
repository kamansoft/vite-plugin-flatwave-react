export type FlatwaveFallbackPolicy = 'default' | 'warn' | 'error';

export interface FlatwaveSitemapOptions {
  hostname?: string;
  changefreq?: string;
  priority?: number;
}

export interface FlatwaveRobotsOptions {
  allowAll?: boolean;
  sitemapPath?: string;
  rules?: string[];
}

export interface FlatwaveContentOptions {
  contentDir: string;
  locales: string[];
  defaultLocale: string;
  fallback?: FlatwaveFallbackPolicy;
  strictMissingLocales?: boolean;
  requiredFields?: string[];
  validateComponents?: boolean;
  componentsDir?: string | string[];
  emitRouteManifest?: boolean;
  emitSitemap?: boolean;
  emitRobotsTxt?: boolean;
  sitemap?: FlatwaveSitemapOptions;
  robots?: FlatwaveRobotsOptions;
}

export interface FlatwaveFrontmatter extends Record<string, unknown> {
  title: string;
  slug: string;
  id: string;
  component: string;
  public?: boolean | string;
  description?: string;
  canonical?: string;
  image?: string;
  robots?: string;
  keywords?: string[];
  jsonLd?: unknown;
  og?: Record<string, string>;
  twitter?: Record<string, string>;
  menu?: string;
  menu_position?: number | string;
}

export interface FlatwaveContentEntry {
  id: string;
  locale: string;
  slug: string;
  path: string;
  file: string;
  component?: string;
  public: boolean;
  attributes: FlatwaveFrontmatter;
  frontmatter: FlatwaveFrontmatter;
  body: string;
  route: string;
  alternatives: Record<string, string>;
}

export interface FlatwaveRoute {
  locale: string;
  path: string;
  contentId: string;
  component?: string;
  metadata: SeoMetadata;
  frontmatter: FlatwaveFrontmatter;
  alternatives: Record<string, string>;
}

export interface FlatwaveContentIndex {
  entries: FlatwaveContentEntry[];
  byId: Record<string, Record<string, FlatwaveContentEntry>>;
  byLocale: Record<string, Record<string, FlatwaveContentEntry>>;
  routes: FlatwaveRoute[];
}

export interface SeoMetadata {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  robots?: string;
  keywords?: string[];
  jsonLd?: unknown;
  og?: Record<string, string>;
  twitter?: Record<string, string>;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}
