// This file provides the virtual:flatwave/content API for SSR builds
// It's used as an alias replacement for the virtual module in SSR builds

import { buildIndex } from 'vite-plugin-flatwave-react/content/indexer.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const options = {
  contentDir: path.resolve(__dirname, 'content'),
  locales: ['es', 'pt'],
  defaultLocale: 'es',
  strictMissingLocales: false,
};

const index = await buildIndex(options);

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

export function getContent(id: string, locale?: string): FlatwaveVirtualContent | undefined {
  if (locale) return index.entries.find((entry) => entry.id === id && entry.locale === locale);
  return index.entries.find((entry) => entry.id === id);
}

export function getAllContent(): FlatwaveVirtualContent[] {
  return index.entries;
}

export function getRoutes(locale?: string): FlatwaveVirtualRoute[] {
  if (locale) return index.routes.filter((route) => route.locale === locale);
  return index.routes;
}

export function getAlternatives(contentId: string, currentLocale?: string): Record<string, string> {
  const entry = index.entries.find((item) => item.id === contentId);
  if (!entry) return {};
  const alternatives = { ...entry.alternatives };
  if (currentLocale) delete alternatives[currentLocale];
  return alternatives;
}

export function getLocale(locale?: string): string | undefined {
  return locale;
}

export function getLocales(): string[] {
  return [...new Set(index.routes.map((route) => route.locale))];
}

export function getDefaultLocale(): string {
  return 'es';
}

export const flatwaveContentIndex = index;
