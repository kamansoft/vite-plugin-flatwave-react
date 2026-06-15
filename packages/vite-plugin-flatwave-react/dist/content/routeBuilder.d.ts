import type { FlatwaveContentEntry, FlatwaveFrontmatter, FlatwaveRoute } from '../types';
export declare function buildContentIndex(entries: FlatwaveContentEntry[]): {
    entries: FlatwaveContentEntry[];
    byId: Record<string, Record<string, FlatwaveContentEntry>>;
    byLocale: Record<string, Record<string, FlatwaveContentEntry>>;
    routes: FlatwaveRoute[];
};
export declare function routeFromLocaleAndSlug(locale: string, slug: string): string;
export declare function isPublicFrontmatter(frontmatter: FlatwaveFrontmatter): boolean;
