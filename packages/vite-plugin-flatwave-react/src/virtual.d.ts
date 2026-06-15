declare module 'virtual:flatwave/content' {
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

  export interface FlatwaveVirtualRoute {
    locale: string;
    path: string;
    contentId: string;
    component?: string;
    metadata: Record<string, unknown>;
    frontmatter: Record<string, unknown>;
    alternatives: Record<string, string>;
  }

  export function getContent(id: string, locale?: string): FlatwaveVirtualContent | undefined;
  export function getAllContent(): FlatwaveVirtualContent[];
  export function getRoutes(locale?: string): FlatwaveVirtualRoute[];
  export function getAlternatives(contentId: string, currentLocale?: string): Record<string, string>;
  export function getLocale(locale?: string): string | undefined;
  export function getLocales(): string[];
  export function getDefaultLocale(): string;
  export const flatwaveContentIndex: {
    entries: FlatwaveVirtualContent[];
    routes: FlatwaveVirtualRoute[];
  };
}
