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
export interface MarkdownCompilerOptions {
    remarkPlugins?: unknown[];
    rehypePlugins?: unknown[];
    allowRawHtml?: boolean;
}
export interface RenderStrategy {
    render(context: unknown): Promise<string>;
}
export interface RenderHooks {
    beforeRender?: (context: unknown) => Promise<unknown> | unknown;
    transformMarkdown?: (markdown: string, context: unknown) => Promise<string> | string;
    transformHtml?: (html: string, context: unknown) => Promise<string> | string;
    afterRender?: (html: string, context: unknown) => Promise<void> | void;
    onError?: (error: Error, context: unknown) => Promise<string> | string;
    emitFiles?: (context: EmitFilesContext) => Promise<SsgOutputFile[]> | SsgOutputFile[];
}
export interface SsgOutputFile {
    fileName: string;
    source: string;
}
export interface EmitFilesContext {
    routes: FlatwaveRoute[];
    contentIndex: FlatwaveContentIndex;
    renderedFiles: SsgOutputFile[];
}
export interface TemplateOverrides {
    indexHtml?: string;
    entryClient?: string;
    entryServer?: string;
}
export interface SsgOptions {
    enabled: boolean;
    strategy?: RenderStrategy;
    hooks?: Partial<RenderHooks>;
    template?: string | TemplateOverrides;
    compileMarkdown?: MarkdownCompilerOptions;
}
export interface FlatwaveContentOptions {
    contentDir: string;
    locales: string[];
    defaultLocale: string;
    fallback?: FlatwaveFallbackPolicy;
    strictMissingLocales?: boolean;
    requiredFields?: string[];
    validateComponents?: boolean;
    emitRouteManifest?: boolean;
    emitSitemap?: boolean;
    emitRobotsTxt?: boolean;
    sitemap?: FlatwaveSitemapOptions;
    robots?: FlatwaveRobotsOptions;
    ssg?: SsgOptions;
}
export interface FlatwaveFrontmatter extends Record<string, unknown> {
    title: string;
    slug: string;
    id: string;
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
export { compileMarkdownToHtml } from './content/markdownCompiler.js';
