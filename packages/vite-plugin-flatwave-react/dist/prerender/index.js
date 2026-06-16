import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createRenderer, filterRoutesForPrerender } from './renderer.js';
import { loadTemplate, extractAssets, injectPreRenderedHtml } from './template.js';
import { discoverComponents } from '../content/validator.js';
export async function createPrerenderPlugin(options, index) {
    const prerenderOptions = normalizePrerenderOptions(options.prerender);
    if (!prerenderOptions) {
        return {
            name: 'flatwave-react:prerender',
            enforce: 'post',
        };
    }
    return {
        name: 'flatwave-react:prerender',
        enforce: 'post',
        async buildStart() {
        },
        async generateBundle(_, bundle) {
        },
    };
}
export async function createPrerenderer(options, index) {
    const prerenderOptions = normalizePrerenderOptions(options.prerender);
    const ssrEntry = options.ssrEntry || 'src/entry-server.tsx';
    let template = '';
    let componentRegistry = {};
    template = await loadTemplate(options.template);
    componentRegistry = await buildComponentRegistry(options.componentsDir);
    const renderer = await createRenderer(ssrEntry, index, componentRegistry);
    return {
        async prerender(outputDir) {
            const routes = filterRoutesForPrerender(index.routes, prerenderOptions);
            const indexHtmlPath = path.resolve(outputDir, 'index.html');
            const indexHtml = await readFile(indexHtmlPath, 'utf-8');
            const assets = extractAssets(indexHtml);
            const results = [];
            for (const route of routes) {
                const content = findContentForRoute(route, index);
                if (!content) {
                    console.warn(`Content not found for route: ${route.path}`);
                    continue;
                }
                const pageContext = {
                    locale: route.locale,
                    content,
                    route,
                    components: {},
                };
                const appHtml = await renderer.render(route.path, pageContext);
                const fullHtml = injectPreRenderedHtml(template, appHtml, route, assets);
                const fileName = route.path.replace(/^\//, '').replace(/\/$/, '') + '/index.html';
                results.push({ path: fileName, html: fullHtml });
            }
            return results;
        },
    };
}
function normalizePrerenderOptions(prerender) {
    if (!prerender)
        return undefined;
    if (prerender === true)
        return {};
    return prerender;
}
async function buildComponentRegistry(componentsDir) {
    const componentNames = await discoverComponents(componentsDir);
    const registry = {};
    for (const name of componentNames) {
        try {
            const module = await import(`/${name}`);
            registry[name] = module.default || module[name];
        }
        catch {
            try {
                const module = await import(`../components/${name}`);
                registry[name] = module.default || module[name];
            }
            catch {
                console.warn(`Component ${name} not found`);
            }
        }
    }
    return registry;
}
function findContentForRoute(route, index) {
    return index.byId[route.contentId]?.[route.locale];
}
function findIndexHtml(bundle) {
    for (const item of Object.values(bundle)) {
        if (item && typeof item === 'object' && 'fileName' in item && item.fileName === 'index.html' && 'source' in item) {
            return String(item.source);
        }
    }
    return undefined;
}
