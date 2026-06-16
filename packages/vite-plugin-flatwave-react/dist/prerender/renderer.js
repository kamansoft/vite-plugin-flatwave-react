import path from 'node:path';
async function loadSsrModule(ssrEntry) {
    const mod = await import(ssrEntry);
    if (!mod.render || typeof mod.render !== 'function') {
        throw new Error(`SSR entry module must export a 'render' function: ${ssrEntry}`);
    }
    return mod.render;
}
export async function createRenderer(ssrEntry, index, componentRegistry) {
    const ssrModulePath = path.resolve(ssrEntry);
    let renderer;
    try {
        renderer = await loadSsrModule(ssrModulePath);
    }
    catch (error) {
        throw new Error(`Failed to load SSR entry module: ${ssrEntry}\n${error instanceof Error ? error.message : String(error)}`);
    }
    const wrappedRenderer = {
        async render(url, pageContext) {
            const route = index.routes.find((r) => r.path === url);
            if (!route) {
                throw new Error(`Route not found: ${url}`);
            }
            const content = pageContext.content;
            if (!content) {
                throw new Error(`Content not found for route: ${url}`);
            }
            const ctx = {
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
function getPrerenderOptions(options) {
    if (!options || options === true)
        return {};
    return options;
}
function shouldPrerenderRoute(route, options, allRoutes) {
    const prerenderOpts = getPrerenderOptions(options);
    if (!prerenderOpts)
        return false;
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
function matchRoute(path, pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(path);
}
export function filterRoutesForPrerender(routes, prerenderOptions) {
    if (!prerenderOptions)
        return [];
    return routes.filter((route) => shouldPrerenderRoute(route, prerenderOptions, routes));
}
