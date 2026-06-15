import type { FlatwaveFrontmatter } from '../types';
export interface MarkdownParseResult {
    body: string;
    attributes: FlatwaveFrontmatter;
    frontmatter: FlatwaveFrontmatter;
}
export declare function parseMarkdown(source: string): MarkdownParseResult;
