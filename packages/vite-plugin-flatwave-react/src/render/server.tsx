/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  FlatwaveContentIndex,
  FlatwaveRoute,
  FlatwaveContentEntry,
  NormalizedOptions,
  PrerenderOptions,
} from '../types';
import { discoverComponents } from '../content/validator.js';
import {
  loadTemplate,
  extractAssets,
  injectPreRenderedHtml,
  injectPageContextScript,
} from './html.js';
import {
  filterRoutesForPrerender,
  resolveContentForRoute,
  buildPageContext,
  serializePageContext,
} from './page.js';

export {
  loadTemplate,
  extractAssets,
  injectPreRenderedHtml,
  injectPageContextScript,
  renderRouteHtml,
} from './html.js';
export {
  filterRoutesForPrerender,
  resolveContentForRoute,
  buildPageContext,
  serializePageContext,
} from './page.js';

export interface PageContext {
  locale: string;
  content: FlatwaveContentEntry;
  route: FlatwaveRoute;
  components: Record<string, React.ComponentType<any>>;
}

export interface Renderer {
  (url: string, pageContext: PageContext): Promise<string>;
}

async function loadSsrModule(ssrEntry: string): Promise<Renderer> {
  const mod = await import(ssrEntry);
  if (!mod.render || typeof mod.render !== 'function') {
    throw new Error(`SSR entry module must export a 'render' function: ${ssrEntry}`);
  }
  return mod.render;
}

export async function createRenderer(
  ssrEntry: string,
  index: FlatwaveContentIndex,
  componentRegistry: Record<string, React.ComponentType<any>>
): Promise<Renderer> {
  const ssrModulePath = path.resolve(ssrEntry);

  let renderer: Renderer;
  try {
    renderer = await loadSsrModule(ssrModulePath);
  } catch (error) {
    throw new Error(
      `Failed to load SSR entry module: ${ssrEntry}\n${error instanceof Error ? error.message : String(error)}`
    );
  }

  const wrappedRenderer: Renderer = async (
    url: string,
    pageContext: PageContext
  ): Promise<string> => {
    const route = index.routes.find((r) => r.path === url);
    if (!route) {
      throw new Error(`Route not found: ${url}`);
    }

    const content = pageContext.content;
    if (!content) {
      throw new Error(`Content not found for route: ${url}`);
    }

    const ctx: PageContext = {
      locale: route.locale,
      content,
      route,
      components: { ...componentRegistry, ...pageContext.components },
    };

    return renderer(url, ctx);
  };

  return wrappedRenderer;
}

export interface Prerenderer {
  prerender(outputDir: string): Promise<Array<{ path: string; html: string }>>;
}

export async function createPrerenderer(
  options: NormalizedOptions,
  index: FlatwaveContentIndex
): Promise<Prerenderer> {
  const prerenderOptions = normalizePrerenderOptions(options.prerender);
  const ssrEntry = options.ssrEntry || 'src/entry-server.tsx';

  let template = '';
  let componentRegistry: Record<string, React.ComponentType<any>> = {};

  template = await loadTemplate(options.template);
  componentRegistry = await buildComponentRegistry(options.componentsDir);

  const renderer = await createRenderer(ssrEntry, index, componentRegistry);

  return {
    async prerender(outputDir: string) {
      const routes = filterRoutesForPrerender(index.routes, prerenderOptions);

      const indexHtmlPath = path.resolve(outputDir, 'index.html');
      const indexHtml = await readFile(indexHtmlPath, 'utf-8');
      const assets = extractAssets(indexHtml);

      const results: Array<{ path: string; html: string }> = [];

      for (const route of routes) {
        const content = resolveContentForRoute(route, index);
        if (!content) {
          console.warn(`Content not found for route: ${route.path}`);
          continue;
        }

        const pageContext: PageContext = {
          locale: route.locale,
          content,
          route,
          components: {},
        };

        const appHtml = await renderer(route.path, pageContext);

        const serializedContext = serializePageContext(buildPageContext(route, content));
        const htmlWithContext = injectPageContextScript(appHtml, serializedContext);

        const fullHtml = injectPreRenderedHtml(template, htmlWithContext, route, assets);

        const fileName = route.path.replace(/^\//, '').replace(/\/$/, '') + '/index.html';
        results.push({ path: fileName, html: fullHtml });
      }

      return results;
    },
  };
}

function normalizePrerenderOptions(
  prerender: NormalizedOptions['prerender']
): PrerenderOptions | true | false | undefined {
  if (!prerender) return undefined;
  if (prerender === true) return {};
  return prerender;
}

async function buildComponentRegistry(
  componentsDir?: string | string[]
): Promise<Record<string, React.ComponentType<any>>> {
  const componentNames = await discoverComponents(componentsDir);
  const registry: Record<string, React.ComponentType<any>> = {};

  for (const name of componentNames) {
    try {
      const module = await import(`/${name}`);
      registry[name] = module.default || module[name];
    } catch {
      try {
        const module = await import(`../components/${name}`);
        registry[name] = module.default || module[name];
      } catch {
        console.warn(`Component ${name} not found`);
      }
    }
  }

  return registry;
}
