import type { FlatwaveContentEntry, FlatwaveContentIndex, FlatwaveContentOptions } from '../types';
import { buildContentIndex } from './routeBuilder.js';
import { routeForLocaleSlug, scanMarkdownFiles } from './scanner.js';

export async function buildIndex(options: FlatwaveContentOptions): Promise<FlatwaveContentIndex> {
  const parsed = await scanMarkdownFiles(options.contentDir, options.locales);
  const byLocaleAndId = new Map<string, FlatwaveContentEntry>();
  const entries: FlatwaveContentEntry[] = [];

  for (const file of parsed) {
    const id = String(file.frontmatter.id || file.slug);
    const key = `${file.locale}:${id}`;
    byLocaleAndId.set(key, {
      id,
      locale: file.locale,
      slug: file.slug,
      path: routeForLocaleSlug(file.locale, file.slug),
      file: file.file,
      public:
        file.frontmatter.public !== false &&
        String(file.frontmatter.public ?? 'true').toLowerCase() !== 'false',
      attributes: { ...file.frontmatter },
      frontmatter: file.frontmatter,
      body: file.body,
      route: routeForLocaleSlug(file.locale, file.slug),
      alternatives: {},
    });
    entries.push(byLocaleAndId.get(key)!);
  }

  const alternatives: Record<string, Record<string, string>> = {};
  for (const entry of entries) {
    alternatives[entry.id] ??= {};
    alternatives[entry.id][entry.locale] = entry.route;
  }

  for (const entry of entries) {
    entry.alternatives = alternatives[entry.id] ?? {};
  }

  return buildContentIndex(entries);
}
