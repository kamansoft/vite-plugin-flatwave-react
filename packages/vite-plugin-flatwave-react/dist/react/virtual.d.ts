declare module 'virtual:flatwave/content' {
  export interface FlatwaveVirtualFrontmatter {
    title?: string;
    slug?: string;
    id?: string;
    public?: boolean | string;
    description?: string;
    canonical?: string;
    image?: string;
    robots?: string;
    keywords?: string[];
    jsonLd?: unknown;
    og?: Record<string, unknown>;
    twitter?: Record<string, unknown>;
    menu?: string;
    menu_position?: number | string;
    body?: string;
    [key: string]: unknown;
  }

  export interface FlatwaveVirtualContent {
    id: string;
    locale: string;
    slug: string;
    path: string;
    file: string;
    public: boolean;
    attributes: Record<string, unknown>;
    frontmatter: FlatwaveVirtualFrontmatter;
    body: string;
    route: string;
    alternatives: Record<string, string>;
  }

  export interface FlatwaveSeoMetadata {
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

  export interface FlatwaveVirtualRoute {
    locale: string;
    path: string;
    contentId: string;
    metadata: FlatwaveSeoMetadata;
    frontmatter: FlatwaveVirtualFrontmatter;
    alternatives: Record<string, string>;
  }

  export function getContent(id: string, locale?: string): FlatwaveVirtualContent | undefined;
  export function getAllContent(): FlatwaveVirtualContent[];
  export function getRoutes(locale?: string): FlatwaveVirtualRoute[];
  export function getAlternatives(
    contentId: string,
    currentLocale?: string
  ): Record<string, string>;
  export function getLocale(locale?: string): string | undefined;
  export function getLocales(): string[];
  export function getDefaultLocale(): string;
  export const flatwaveContentIndex: {
    entries: FlatwaveVirtualContent[];
    routes: FlatwaveVirtualRoute[];
  };
}
