import type { Plugin } from 'vite';
import { createRenderer, filterRoutesForPrerender, PageContext } from './renderer.js';
import { loadTemplate, extractAssets, injectPreRenderedHtml } from './template.js';
import type { FlatwaveContentIndex, FlatwaveRoute, FlatwaveContentEntry, NormalizedOptions } from '../types';
import { discoverComponents } from '../content/validator.js';

export async function createPrerenderPlugin(
  options: NormalizedOptions,
  index: FlatwaveContentIndex
): Promise<Plugin> {
  let renderer: ReturnType<typeof createRenderer> | null = null;
  let template = '';
  let componentRegistry: Record<string, React.ComponentType<any>> = {};

  const prerenderOptions = normalizePrerenderOptions(options.prerender);
  const ssrEntry = options.ssrEntry || 'src/entry-server.tsx';

  return {
    name: 'flatwave-react:prerender',
    enforce: 'post',
    async buildStart() {
      template = await loadTemplate(options.template);
      componentRegistry = await buildComponentRegistry(options.componentsDir);
      
      if (prerenderOptions) {
        try {
          renderer = await createRenderer(ssrEntry, index, componentRegistry);
        } catch (error) {
          this.warn(`Failed to initialize SSR renderer: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    },
    async generateBundle(_, bundle) {
      if (!prerenderOptions || !renderer) return;

      const routes = filterRoutesForPrerender(index.routes, prerenderOptions);
      const html = findIndexHtml(bundle);
      const assets = extractAssets(html ?? '');

      for (const route of routes) {
        const content = findContentForRoute(route, index);
        if (!content) {
          this.warn(`Content not found for route: ${route.path}`);
          continue;
        }

        const pageContext: PageContext = {
          locale: route.locale,
          content,
          route,
          components: {},
        };

        try {
          const appHtml = await renderer.render(route.path, pageContext);
          const fullHtml = injectPreRenderedHtml(template, appHtml, route, assets);
          
          const fileName = route.path.replace(/^\//, '').replace(/\/$/, '') + '/index.html';
          this.emitFile({
            type: 'asset',
            fileName,
            source: fullHtml,
          });
        } catch (error) {
          this.error(`Failed to pre-render route ${route.path}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    },
  };
}

function normalizePrerenderOptions(prerender: NormalizedOptions['prerender']): NormalizedOptions['prerender'] {
  if (!prerender) return undefined;
  if (prerender === true) return {};
  return prerender;
}

async function buildComponentRegistry(componentsDir?: string | string[]): Promise<Record<string, React.ComponentType<any>>> {
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

function findContentForRoute(route: FlatwaveRoute, index: FlatwaveContentIndex): FlatwaveContentEntry | undefined {
  return index.byId[route.contentId]?.[route.locale];
}

function findIndexHtml(bundle: Record<string, unknown>): string | undefined {
  for (const item of Object.values(bundle)) {
    if (item && typeof item === 'object' && 'fileName' in item && item.fileName === 'index.html' && 'source' in item) {
      return String((item as { source?: unknown }).source);
    }
  }
  return undefined;
}