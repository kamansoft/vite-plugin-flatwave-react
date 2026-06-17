import type { FlatwaveRoute, FlatwaveContentEntry, FlatwaveContentIndex, PrerenderOptions, SerializedPageContext } from '../types';

export function resolveRouteByPath(routes: FlatwaveRoute[], path: string): FlatwaveRoute | undefined {
  return routes.find((route) => route.path === path);
}

export function resolveContentForRoute(route: FlatwaveRoute, index: FlatwaveContentIndex): FlatwaveContentEntry | undefined {
  return index.byId[route.contentId]?.[route.locale];
}

export function buildPageContext(route: FlatwaveRoute, content: FlatwaveContentEntry): SerializedPageContext {
  return {
    locale: route.locale,
    route,
    content,
  };
}

export function serializePageContext(pageContext: SerializedPageContext): string {
  return JSON.stringify(pageContext);
}

export function deserializePageContext(serialized: string): SerializedPageContext {
  return JSON.parse(serialized);
}

export function filterRoutesForPrerender(
  routes: FlatwaveRoute[],
  prerenderOptions: PrerenderOptions | true | false | undefined
): FlatwaveRoute[] {
  if (!prerenderOptions) return [];
  
  const options = prerenderOptions === true ? {} : prerenderOptions;
  
  return routes.filter((route) => shouldPrerenderRoute(route, options, routes));
}

function shouldPrerenderRoute(
  route: FlatwaveRoute,
  options: PrerenderOptions,
  allRoutes: FlatwaveRoute[]
): boolean {
  if (options.exclude && options.exclude.some((pattern) => matchRoute(route.path, pattern))) {
    return false;
  }
  
  if (options.routes) {
    if (typeof options.routes === 'function') {
      const allowed = options.routes(allRoutes);
      return allowed.includes(route.path);
    }
    return options.routes.includes(route.path);
  }
  
  return true;
}

function matchRoute(path: string, pattern: string): boolean {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  return regex.test(path);
}

export function validateRouteForNavigation(
  path: string,
  inventory: { routes: FlatwaveRoute[] }
): FlatwaveRoute | null {
  const route = inventory.routes.find((r) => r.path === path);
  return route ?? null;
}

export function getRouteInventory(index: FlatwaveContentIndex): { routes: FlatwaveRoute[]; content: FlatwaveContentEntry[] } {
  return {
    routes: index.routes,
    content: index.entries,
  };
}