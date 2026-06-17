import fg from 'fast-glob';
import path from 'node:path';
import matter from 'gray-matter';
import type { FlatwaveContentEntry, FlatwaveFrontmatter } from '../types';

export interface ParsedMarkdownFile {
  file: string;
  locale: string;
  slug: string;
  body: string;
  frontmatter: FlatwaveFrontmatter;
}

export async function scanMarkdownFiles(
  contentDir: string,
  locales: string[]
): Promise<ParsedMarkdownFile[]> {
  const files: ParsedMarkdownFile[] = [];

  for (const locale of locales) {
    const localeDir = path.resolve(contentDir, locale);
    const matches = await fg('**/*.md', {
      cwd: localeDir,
      onlyFiles: true,
      absolute: true,
      ignore: ['**/node_modules/**'],
    });

    for (const file of matches.sort()) {
      const source = await readFile(file);
      const parsed = matter(source);
      const frontmatter = parsed.data as FlatwaveFrontmatter;
      const slug = normalizeSlug(String(frontmatter.slug || path.basename(file, '.md')));
      files.push({
        file,
        locale,
        slug,
        body: parsed.content.trim(),
        frontmatter,
      });
    }
  }

  return files;
}

async function readFile(file: string): Promise<string> {
  const fs = await import('node:fs/promises');
  return fs.readFile(file, 'utf-8');
}

export function normalizeSlug(slug: string): string {
  return `/${slug.replace(/^\/+|\/+$/g, '')}`;
}

export function routeForLocaleSlug(locale: string, slug: string): string {
  const normalized = normalizeSlug(slug);
  const isHome = normalized === '/' || normalized === '/index';
  return isHome ? `/${locale}/` : `/${locale}${normalized}`;
}

export function isPublicEntry(frontmatter: FlatwaveFrontmatter): boolean {
  if (typeof frontmatter.public === 'boolean') return frontmatter.public;
  return String(frontmatter.public ?? 'true').toLowerCase() !== 'false';
}

export function buildContentEntry(
  parsed: ParsedMarkdownFile,
  alternatives: Record<string, string>
): FlatwaveContentEntry {
  const route = routeForLocaleSlug(parsed.locale, parsed.slug);
  const attributes = { ...parsed.frontmatter };

  return {
    id: String(parsed.frontmatter.id || parsed.slug),
    locale: parsed.locale,
    slug: parsed.slug,
    path: route,
    file: parsed.file,
    component: parsed.frontmatter.component ? String(parsed.frontmatter.component) : undefined,
    public: isPublicEntry(parsed.frontmatter),
    attributes,
    frontmatter: parsed.frontmatter,
    body: parsed.body,
    route,
    alternatives,
  };
}
