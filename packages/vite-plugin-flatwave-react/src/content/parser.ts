import matter from 'gray-matter';
import type { FlatwaveFrontmatter } from '../types';

export interface MarkdownParseResult {
  body: string;
  attributes: FlatwaveFrontmatter;
  frontmatter: FlatwaveFrontmatter;
}

export function parseMarkdown(source: string): MarkdownParseResult {
  const parsed = matter(source);
  const frontmatter = parsed.data as FlatwaveFrontmatter;
  const attributes = { ...frontmatter };

  return {
    body: parsed.content.trim(),
    attributes,
    frontmatter,
  };
}
