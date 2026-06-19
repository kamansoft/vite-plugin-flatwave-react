import type { Plugin } from 'vite';
import path from 'node:path';
import { buildIndex } from './content/indexer.js';
import { validateContent } from './content/validator.js';
import { parseMarkdown } from './content/parser.js';
import { routeForLocaleSlug } from './content/scanner.js';
import { escapeXml } from './seo/metadata.js';
import { createPrerenderer, extractAssets, renderRouteHtml } from './render/server.js';
import type {
  FlatwaveContentIndex,
  FlatwaveContentOptions,
  FlatwaveRoute,
  NormalizedOptions,
  PrerenderOptions,
} from './types';

const VIRTUAL_ID = '\0virtual:flatwave/content';
const PUBLIC_VIRTUAL_ID = 'virtual:flatwave/content';

export async function flatwaveContent(options: FlatwaveContentOptions): Promise<Plugin[]> {
  const normalizedOptions = normalizeOptions(options);
  let index: FlatwaveContentIndex = { entries: [], byId: {}, byLocale: {}, routes: [] };

  const contentPlugin: Plugin = {
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
  };

  const markdownPlugin: Plugin = {
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
  };

  const ssgPlugin: Plugin = {
    name: 'flatwave-react:ssg',
    async generateBundle(_, bundle) {
      const routes = index.routes;
      const html = findIndexHtml(bundle);
      const assets = extractAssets(html);

      if (normalizedOptions.emitRouteManifest !== false) {
        this.emitFile({
          type: 'asset',
          fileName: 'route-manifest.json',
          source: JSON.stringify(routes, null, 2),
        });
      }

      if (normalizedOptions.emitSitemap !== false) {
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: renderSitemap(
            routes,
            normalizedOptions.sitemap?.hostname ?? 'http://localhost:4173'
          ),
        });
      }

      if (normalizedOptions.emitRobotsTxt !== false) {
        this.emitFile({
          type: 'asset',
          fileName: 'robots.txt',
          source: renderRobotsTxt(normalizedOptions.sitemap?.hostname ?? 'http://localhost:4173'),
        });
      }

      if (!normalizedOptions.prerender) {
        for (const route of routes) {
          this.emitFile({
            type: 'asset',
            fileName: `${route.path.replace(/^\//, '').replace(/\/$/, '')}/index.html`,
            source: renderRouteHtml(route, assets),
          });
        }
      }
    },
  };

  const prerenderPlugin = await createPrerenderPlugin(normalizedOptions, index);

  return [contentPlugin, markdownPlugin, ssgPlugin, prerenderPlugin];
}

export async function createPrerenderPlugin(
  options: NormalizedOptions,
  index: FlatwaveContentIndex
): Promise<Plugin> {
  const prerenderOptions = normalizePrerenderOptions(options.prerender);

  if (!prerenderOptions) {
    return {
      name: 'flatwave-react:prerender',
      enforce: 'post',
    };
  }

  // Skip built-in prerender if ssrEntry is a TypeScript file (needs separate SSR build first)
  const ssrEntry = options.ssrEntry || '';
  const skipBuiltinPrerender = ssrEntry.endsWith('.tsx') || ssrEntry.endsWith('.ts');

  return {
    name: 'flatwave-react:prerender',
    enforce: 'post',
    async generateBundle(_) {
      if (skipBuiltinPrerender) {
        return;
      }

      const prerenderer = await createPrerenderer(options, index);
      const outputDir = process.cwd() + '/dist';
      const results = await prerenderer.prerender(outputDir);

      for (const { path: fileName, html } of results) {
        this.emitFile({
          type: 'asset',
          fileName,
          source: html,
        });
      }
    },
  };
}

function normalizeOptions(options: FlatwaveContentOptions): NormalizedOptions {
  if (!options.locales.includes(options.defaultLocale)) {
    throw new Error(`defaultLocale '${options.defaultLocale}' must be included in locales.`);
  }

  const renderLoop =
    options.renderLoop === undefined && options.prerender ? { enabled: true } : options.renderLoop;

  return {
    ...options,
    requiredFields: options.requiredFields ?? ['title', 'slug', 'id', 'component', 'public'],
    validateComponents: options.validateComponents ?? true,
    componentsDir: options.componentsDir,
    emitRouteManifest: options.emitRouteManifest ?? true,
    emitSitemap: options.emitSitemap ?? true,
    emitRobotsTxt: options.emitRobotsTxt ?? true,
    template: options.template,
    prerender: options.prerender,
    ssrEntry: options.ssrEntry,
    renderLoop,
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

function renderSitemap(routes: FlatwaveRoute[], hostname: string): string {
  const base = hostname.replace(/\/$/, '');
  const urls = routes
    .map((route) => {
      const loc = `${base}${route.path}`;
      return `<url><loc>${escapeXml(loc)}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>
`;
}

function renderRobotsTxt(hostname: string): string {
  const base = hostname.replace(/\/$/, '');
  return `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
}

function normalizePrerenderOptions(
  prerender: NormalizedOptions['prerender']
): PrerenderOptions | true | false | undefined {
  if (!prerender) return undefined;
  if (prerender === true) return {};
  return prerender;
}

export default flatwaveContent;
