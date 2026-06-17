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
export interface PrerenderOptions {
    routes?: string[] | ((routes: FlatwaveRoute[]) => string[]);
    exclude?: string[];
    stream?: boolean;
    template?: string;
}
export interface RenderLoopOptions {
    enabled?: boolean;
    basePath?: string;
    scrollToTop?: boolean;
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
    template?: string;
    prerender?: boolean | PrerenderOptions;
    ssrEntry?: string;
    renderLoop?: boolean | RenderLoopOptions;
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
export interface FlatwaveVirtualRoute {
    locale: string;
    path: string;
    contentId: string;
    component?: string;
    metadata: Record<string, unknown>;
    frontmatter: Record<string, unknown>;
    alternatives: Record<string, string>;
}
export interface FlatwaveVirtualContent {
    id: string;
    locale: string;
    slug: string;
    path: string;
    file: string;
    component?: string;
    public: boolean;
    attributes: Record<string, unknown>;
    frontmatter: Record<string, unknown>;
    body: string;
    route: string;
    alternatives: Record<string, string>;
}
export interface SerializedPageContext {
    locale: string;
    route: FlatwaveRoute;
    content: FlatwaveContentEntry;
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
export interface NormalizedOptions {
    contentDir: string;
    locales: string[];
    defaultLocale: string;
    fallback?: FlatwaveFallbackPolicy;
    strictMissingLocales?: boolean;
    requiredFields: string[];
    validateComponents: boolean;
    componentsDir?: string | string[];
    emitRouteManifest: boolean;
    emitSitemap: boolean;
    emitRobotsTxt: boolean;
    sitemap?: FlatwaveSitemapOptions;
    robots?: FlatwaveRobotsOptions;
    template?: string;
    prerender?: PrerenderOptions | true | false;
    ssrEntry?: string;
    renderLoop?: RenderLoopOptions | true | false;
}
