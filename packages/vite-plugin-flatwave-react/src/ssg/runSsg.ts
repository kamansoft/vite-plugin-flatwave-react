import type {
  FlatwaveContentIndex,
  FlatwaveRoute,
  FlatwaveContentOptions,
  SsgOptions,
} from '../types.js';
import type { RenderContext } from './types.js';
import { DefaultRenderStrategy } from './DefaultRenderStrategy.js';
import { RenderPipeline } from './RenderPipeline.js';
import { resolveTemplate, renderTemplate } from './template.js';
import { escapeHtml, escapeXml, renderHtmlHead } from '../seo/metadata.js';
import {
  compileMarkdownToHtml,
  type MarkdownCompilerOptions,
} from '../content/markdownCompiler.js';
import type { SsgOutputFile } from '../types.js';

export function renderSitemap(routes: FlatwaveRoute[], hostname: string): string {
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

export function renderRobotsTxt(hostname: string): string {
  const base = hostname.replace(/\/$/, '');
  return `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
}

async function buildComponentsMap(routes: FlatwaveRoute[]): Promise<Map<string, unknown>> {
  const components = new Map<string, unknown>();
  const uniqueComponents = new Set(routes.map((r) => r.component).filter(Boolean));

  for (const componentName of uniqueComponents) {
    try {
      const module = await import(`../react/${componentName}.js`);
      components.set(componentName!, module);
    } catch {
      try {
        const module = await import(`virtual:flatwave/components/${componentName}`);
        components.set(componentName!, module);
      } catch {
        console.warn(`[SSG] Could not load component: ${componentName}`);
      }
    }
  }

  return components;
}

function toCompilerOptions(
  opts?: SsgOptions['compileMarkdown']
): MarkdownCompilerOptions | undefined {
  if (!opts) return undefined;
  return {
    remarkPlugins: opts.remarkPlugins as MarkdownCompilerOptions['remarkPlugins'],
    rehypePlugins: opts.rehypePlugins as MarkdownCompilerOptions['rehypePlugins'],
    allowRawHtml: opts.allowRawHtml,
  };
}

export async function runSsg(
  index: FlatwaveContentIndex,
  options: FlatwaveContentOptions & { ssg?: SsgOptions },
  assets: { scripts: string[]; styles: string[] }
): Promise<SsgOutputFile[]> {
  const ssgOptions = options.ssg ?? { enabled: true };
  if (!ssgOptions.enabled) return [];

  const routes = index.routes;

  const strategy = ssgOptions.strategy ?? new DefaultRenderStrategy();
  const pipeline = new RenderPipeline(ssgOptions.hooks);

  const components = await buildComponentsMap(routes);

  const concurrencyLimit = 4;
  const routeChunks: FlatwaveRoute[][] = [];
  for (let i = 0; i < routes.length; i += concurrencyLimit) {
    routeChunks.push(routes.slice(i, i + concurrencyLimit));
  }

  const outputFiles: SsgOutputFile[] = [];

  for (const chunk of routeChunks) {
    const results = await Promise.all(
      chunk.map(async (route) => {
        const contentEntry = index.entries.find(
          (e) => e.id === route.contentId && e.locale === route.locale
        );
        if (!contentEntry) {
          console.warn(`[SSG] No content entry found for route: ${route.path}`);
          return null;
        }

        let context: RenderContext = {
          route,
          contentEntry,
          components,
          assets,
          hooks: pipeline,
          options: ssgOptions,
          locale: route.locale,
          allRoutes: routes,
        };

        context = await pipeline.executeBeforeRender(context);

        const transformedMarkdown = await pipeline.executeTransformMarkdown(
          contentEntry.body,
          context
        );
        const compiledMarkdown = await compileMarkdownToHtml(
          transformedMarkdown,
          toCompilerOptions(ssgOptions.compileMarkdown)
        );

        const contentEntryWithHtml = {
          ...contentEntry,
          body: compiledMarkdown,
        };

        const renderContext: RenderContext = {
          ...context,
          contentEntry: contentEntryWithHtml,
        };

        let appHtml: string;
        try {
          appHtml = await strategy.render(renderContext);
        } catch (error) {
          const fallbackHtml = await pipeline.executeOnError(error as Error, renderContext);
          appHtml = fallbackHtml;
        }

        const template = resolveTemplate(
          'index.html',
          ssgOptions.template as { indexHtml?: string } | undefined
        );
        const seoMetadata = route.metadata;
        const headTags = renderHtmlHead(route);

        const templateVariables = {
          appHtml,
          title: escapeHtml(seoMetadata.title),
          meta: escapeHtml(seoMetadata.description || seoMetadata.title),
          assets,
          locale: route.locale,
          canonical: escapeHtml(seoMetadata.canonical ?? route.path),
          headTags,
        };

        // transformHtml runs on the FULL HTML (after template) so hooks can
        // inject into <head>/<body> (e.g. analytics, CSP headers)
        let finalHtml = renderTemplate(template, templateVariables);
        finalHtml = await pipeline.executeTransformHtml(finalHtml, renderContext);
        await pipeline.executeAfterRender(finalHtml, renderContext);

        const fileName = `${route.path.replace(/^\//, '').replace(/\/$/, '')}/index.html`;

        return { fileName, source: finalHtml };
      })
    );

    for (const result of results) {
      if (result) {
        outputFiles.push(result);
      }
    }
  }

  if (options.emitRouteManifest !== false) {
    outputFiles.push({
      fileName: 'route-manifest.json',
      source: JSON.stringify(routes, null, 2),
    });
  }

  if (options.emitSitemap !== false) {
    outputFiles.push({
      fileName: 'sitemap.xml',
      source: renderSitemap(routes, options.sitemap?.hostname ?? 'http://localhost:4173'),
    });
  }

  if (options.emitRobotsTxt !== false) {
    outputFiles.push({
      fileName: 'robots.txt',
      source: renderRobotsTxt(options.sitemap?.hostname ?? 'http://localhost:4173'),
    });
  }

  // Call emitFiles hook after all routes are rendered
  const emitFilesContext = {
    routes,
    contentIndex: index,
    renderedFiles: outputFiles,
  };
  const emittedFiles = await pipeline.executeEmitFiles(emitFilesContext);
  outputFiles.push(...emittedFiles);

  return outputFiles;
}
