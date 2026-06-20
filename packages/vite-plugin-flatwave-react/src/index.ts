import type { Plugin } from 'vite';
import path from 'node:path';
import { buildIndex } from './content/indexer.js';
import { validateContent } from './content/validator.js';
import { parseMarkdown } from './content/parser.js';
import { routeForLocaleSlug } from './content/scanner.js';
import { runSsg } from './ssg/runSsg.js';
import type { FlatwaveContentIndex, FlatwaveContentOptions } from './types';

const VIRTUAL_ID = '\0virtual:flatwave/content';
const PUBLIC_VIRTUAL_ID = 'virtual:flatwave/content';

export function flatwaveContent(options: FlatwaveContentOptions): Plugin[] {
  const normalizedOptions = normalizeOptions(options);
  let index: FlatwaveContentIndex = { entries: [], byId: {}, byLocale: {}, routes: [] };

  return [
    {
      name: 'flatwave-react:content',
      enforce: 'pre',
      async buildStart() {
        index = await buildIndex(normalizedOptions);
        const validation = await validateContent(normalizedOptions);

        for (const warning of validation.warnings) this.warn(warning);
        for (const error of validation.errors) this.error(error);
      },
      resolveId(id) {
        if (id === PUBLIC_VIRTUAL_ID) return VIRTUAL_ID;
        return null;
      },
      load(id) {
        if (id !== VIRTUAL_ID) return null;
        return createVirtualModule(index, normalizedOptions.defaultLocale);
      },
      async handleHotUpdate(ctx) {
        if (!ctx.file.endsWith('.md')) return;
        index = await buildIndex(normalizedOptions);
      },
    },
    {
      name: 'flatwave-react:markdown',
      enforce: 'pre',
      resolveId(id) {
        if (id.endsWith('.md')) {
          const resolved = path.resolve(process.cwd(), id);
          return resolved;
        }
        return null;
      },
      async load(id) {
        if (!id.endsWith('.md')) return null;
        const source = await readFile(id);
        const parsed = parseMarkdown(source);
        const locale =
          inferLocale(id, normalizedOptions.contentDir, normalizedOptions.locales) ??
          normalizedOptions.defaultLocale;
        const slug = path.basename(id, '.md');
        const route = routeForLocaleSlug(locale, slug);
        const idValue = slug;

        return `export default ${JSON.stringify(
          {
            body: parsed.body,
            attributes: parsed.attributes,
            frontmatter: parsed.frontmatter,
            locale,
            slug,
            id: idValue,
            route,
            file: id,
          },
          null,
          2
        )};`;
      },
    },
    {
      name: 'flatwave-react:ssg',
      async generateBundle(_, bundle) {
        const html = findIndexHtml(bundle);
        const assets = extractAssets(html);

        const outputFiles = await runSsg(index, normalizedOptions, assets);

        for (const file of outputFiles) {
          this.emitFile({
            type: 'asset',
            fileName: file.fileName,
            source: file.source,
          });
        }
      },
    },
  ];
}

function normalizeOptions(options: FlatwaveContentOptions): FlatwaveContentOptions {
  if (!options.locales.includes(options.defaultLocale)) {
    throw new Error(`defaultLocale '${options.defaultLocale}' must be included in locales.`);
  }

  return {
    ...options,
    requiredFields: options.requiredFields ?? ['title', 'slug', 'id', 'component', 'public'],
    validateComponents: options.validateComponents ?? true,
    componentsDir: options.componentsDir,
    emitRouteManifest: options.emitRouteManifest ?? true,
    emitSitemap: options.emitSitemap ?? true,
    emitRobotsTxt: options.emitRobotsTxt ?? true,
    ssg: {
      enabled: options.ssg?.enabled ?? true,
      strategy: options.ssg?.strategy,
      hooks: options.ssg?.hooks,
      template: options.ssg?.template,
      compileMarkdown: options.ssg?.compileMarkdown,
    },
  };
}

function createVirtualModule(index: FlatwaveContentIndex, defaultLocale: string): string {
  const content = index.entries;
  const routes = index.routes;
  return `
const content = ${JSON.stringify(content)};
const routes = ${JSON.stringify(routes)};

export function getContent(id, locale) {
  if (locale) return content.find((entry) => entry.id === id && entry.locale === locale);
  return content.find((entry) => entry.id === id);
}

export function getAllContent() {
  return content;
}

export function getRoutes(locale) {
  if (locale) return routes.filter((route) => route.locale === locale);
  return routes;
}

export function getAlternatives(contentId, currentLocale) {
  const entry = content.find((item) => item.id === contentId);
  if (!entry) return {};
  const alternatives = { ...entry.alternatives };
  delete alternatives[currentLocale];
  return alternatives;
}

export function getLocale(locale) {
  return locale;
}

export function getLocales() {
  return [...new Set(routes.map((route) => route.locale))];
}

export function getDefaultLocale() {
  return ${JSON.stringify(defaultLocale)};
}

export const flatwaveContentIndex = ${JSON.stringify(index)};
`;
}

async function readFile(file: string): Promise<string> {
  const fs = await import('node:fs/promises');
  return fs.readFile(file, 'utf-8');
}

function inferLocale(file: string, contentDir: string, locales: string[]): string | undefined {
  const relative = path.relative(path.resolve(contentDir), file);
  const firstSegment = relative.split(path.sep)[0];
  return locales.includes(firstSegment) ? firstSegment : undefined;
}

function findIndexHtml(bundle: Record<string, unknown>): string | undefined {
  for (const item of Object.values(bundle)) {
    if (
      item &&
      typeof item === 'object' &&
      'fileName' in item &&
      item.fileName === 'index.html' &&
      'source' in item
    ) {
      return String((item as { source?: unknown }).source);
    }
  }
  return undefined;
}

function extractAssets(html: string | undefined): { scripts: string[]; styles: string[] } {
  if (!html) return { scripts: [], styles: [] };
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"[^>]*>/g)].map(
    (match) => match[1]
  );
  const styles = [
    ...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css)"[^>]*>/g),
  ].map((match) => match[1]);
  return { scripts, styles };
}

export default flatwaveContent;
