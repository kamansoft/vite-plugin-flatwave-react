import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { FlatwaveContentIndex, FlatwaveRoute, FlatwaveContentEntry, NormalizedOptions, PrerenderOptions } from '../types';

export interface PageContext {
  locale: string;
  content: FlatwaveContentEntry;
  route: FlatwaveRoute;
  components: Record<string, React.ComponentType<any>>;
}

export interface Renderer {
  render(url: string, pageContext: PageContext): Promise<string>;
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
    throw new Error(`Failed to load SSR entry module: ${ssrEntry}\n${error instanceof Error ? error.message : String(error)}`);
  }

  const wrappedRenderer: Renderer = {
    async render(url: string, pageContext: PageContext): Promise<string> {
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

      return renderer.render(url, ctx);
    },
  };

  return wrappedRenderer;
}

function getPrerenderOptions(options: NormalizedOptions['prerender']): PrerenderOptions | undefined {
  if (!options || options === true) return {};
  return options;
}

function shouldPrerenderRoute(
  route: FlatwaveRoute,
  options: NormalizedOptions['prerender'],
  allRoutes: FlatwaveRoute[]
): boolean {
  const prerenderOpts = getPrerenderOptions(options);
  if (!prerenderOpts) return false;
  
  if (prerenderOpts.exclude && prerenderOpts.exclude.some((pattern) => matchRoute(route.path, pattern))) {
    return false;
  }
  
  if (prerenderOpts.routes) {
    if (typeof prerenderOpts.routes === 'function') {
      const allowed = prerenderOpts.routes(allRoutes);
      return allowed.includes(route.path);
    }
    return prerenderOpts.routes.includes(route.path);
  }
  
  return true;
}

function matchRoute(path: string, pattern: string): boolean {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  return regex.test(path);
}

export function filterRoutesForPrerender(
  routes: FlatwaveRoute[],
  prerenderOptions: NormalizedOptions['prerender']
): FlatwaveRoute[] {
  if (!prerenderOptions) return [];
  
  return routes.filter((route) => shouldPrerenderRoute(route, prerenderOptions, routes));
}