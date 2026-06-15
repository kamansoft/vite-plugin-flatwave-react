import type { FlatwaveContentEntry, FlatwaveFrontmatter } from '../types';
export interface ParsedMarkdownFile {
    file: string;
    locale: string;
    slug: string;
    body: string;
    frontmatter: FlatwaveFrontmatter;
}
export declare function scanMarkdownFiles(contentDir: string, locales: string[]): Promise<ParsedMarkdownFile[]>;
export declare function normalizeSlug(slug: string): string;
export declare function routeForLocaleSlug(locale: string, slug: string): string;
export declare function isPublicEntry(frontmatter: FlatwaveFrontmatter): boolean;
export declare function buildContentEntry(parsed: ParsedMarkdownFile, alternatives: Record<string, string>): FlatwaveContentEntry;
