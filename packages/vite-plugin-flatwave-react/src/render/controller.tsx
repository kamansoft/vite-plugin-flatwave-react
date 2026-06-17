import { hydrateRoot, type Root } from 'react-dom/client';
import type { RenderControllerOptions, SerializedPageContext } from './types.js';
import { Navigation } from './navigation.js';
import { ScrollManager } from './scroll-manager.js';
import { getRoutes, getContent } from 'virtual:flatwave/content';
import type { FlatwaveRoute, FlatwaveContentEntry, FlatwaveVirtualRoute, FlatwaveVirtualContent, SeoMetadata } from '../types';

function toFlatwaveRoute(virtualRoute: FlatwaveVirtualRoute): FlatwaveRoute {
  return {
    locale: virtualRoute.locale,
    path: virtualRoute.path,
    contentId: virtualRoute.contentId,
    component: virtualRoute.component,
    metadata: virtualRoute.metadata as unknown as SeoMetadata,
    frontmatter: virtualRoute.frontmatter as unknown as FlatwaveRoute['frontmatter'],
    alternatives: virtualRoute.alternatives,
  };
}

function toFlatwaveContentEntry(virtualContent: FlatwaveVirtualContent): FlatwaveContentEntry {
  return {
    id: virtualContent.id,
    locale: virtualContent.locale,
    slug: virtualContent.slug,
    path: virtualContent.path,
    file: virtualContent.file,
    component: virtualContent.component,
    public: virtualContent.public,
    attributes: virtualContent.attributes as unknown as FlatwaveContentEntry['attributes'],
    frontmatter: virtualContent.frontmatter as unknown as FlatwaveContentEntry['frontmatter'],
    body: virtualContent.body,
    route: virtualContent.route,
    alternatives: virtualContent.alternatives,
  };
}

export class RenderController {
  private root: Root | null = null;
  private currentPath: string;
  private currentPageContext: SerializedPageContext | null = null;
  private navigation: Navigation;
  private scrollManager: ScrollManager;
  private isRendering = false;
  private App: React.ComponentType<{ pageContext: SerializedPageContext }>;
  private basePath: string;

  constructor(options: RenderControllerOptions) {
    this.App = options.App;
    this.basePath = options.basePath ?? '';
    this.currentPath = this.getCurrentPathInternal();
    
    this.scrollManager = new ScrollManager();
    this.navigation = new Navigation({
      basePath: this.basePath,
      onNavigate: (path: string) => this.handleNavigation(path),
      onPopState: (path: string) => this.handlePopState(path),
    });
  }

  start(): void {
    const initialPageContext = this.resolvePageContext(this.currentPath);
    this.currentPageContext = initialPageContext;
    
    this.root = hydrateRoot(document.getElementById('root')!, 
      <this.App pageContext={initialPageContext} />
    );
    
    this.navigation.start();
  }

  private getCurrentPathInternal(): string {
    const path = window.location.pathname;
    if (this.basePath && path.startsWith(this.basePath)) {
      return path.slice(this.basePath.length) || '/';
    }
    return path;
  }

  private resolvePageContext(path: string): SerializedPageContext {
    const routes = getRoutes();
    const virtualRoute = routes.find((r) => r.path === path) ?? routes[0];
    
    if (!virtualRoute) {
      throw new Error(`No routes available`);
    }

    const virtualContent = getContent(virtualRoute.contentId, virtualRoute.locale);
    if (!virtualContent) {
      throw new Error(`Content not found for route: ${path}`);
    }

    const route = toFlatwaveRoute(virtualRoute);
    const content = toFlatwaveContentEntry(virtualContent);

    return {
      locale: route.locale,
      route,
      content,
    };
  }

  private async handleNavigation(path: string): Promise<void> {
    if (this.isRendering) return;
    
    const validatedRoute = this.validateRoute(path);
    if (!validatedRoute) {
      console.warn(`[flatwave] Navigation rejected: unknown route "${path}"`);
      return;
    }

    this.isRendering = true;
    
    try {
      this.scrollManager.saveScrollPosition(this.currentPath);
      
      const pageContext = this.resolvePageContext(path);
      
      this.updateDocumentHead(pageContext);
      
      this.root!.render(<this.App pageContext={pageContext} />);
      
      this.currentPath = path;
      this.currentPageContext = pageContext;
      
      this.scrollManager.scrollToTop();
    } finally {
      this.isRendering = false;
    }
  }

  private async handlePopState(path: string): Promise<void> {
    if (this.isRendering) return;
    
    const validatedRoute = this.validateRoute(path);
    if (!validatedRoute) {
      console.warn(`[flatwave] Popstate rejected: unknown route "${path}"`);
      return;
    }

    this.isRendering = true;
    
    try {
      this.scrollManager.saveScrollPosition(this.currentPath);
      
      const pageContext = this.resolvePageContext(path);
      
      this.updateDocumentHead(pageContext);
      
      this.root!.render(<this.App pageContext={pageContext} />);
      
      this.currentPath = path;
      this.currentPageContext = pageContext;
      
      this.scrollManager.restoreScrollPosition(path);
    } finally {
      this.isRendering = false;
    }
  }

  private validateRoute(path: string): FlatwaveRoute | null {
    const routes = getRoutes();
    const virtualRoute = routes.find((r) => r.path === path) ?? null;
    return virtualRoute ? toFlatwaveRoute(virtualRoute) : null;
  }

  private updateDocumentHead(pageContext: SerializedPageContext): void {
    const { route } = pageContext;
    
    document.title = route.metadata.title;
    
    let descMeta = document.querySelector('meta[name="description"]');
    if (route.metadata.description) {
      if (!descMeta) {
        descMeta = document.createElement('meta');
        descMeta.setAttribute('name', 'description');
        document.head.appendChild(descMeta);
      }
      descMeta.setAttribute('content', route.metadata.description);
    } else if (descMeta) {
      descMeta.remove();
    }

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (route.metadata.canonical) {
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', route.metadata.canonical);
    } else if (canonicalLink) {
      canonicalLink.remove();
    }

    this.updateAlternateLinks(route.alternatives);
    this.updateOgTags(route.metadata.og);
    this.updateTwitterTags(route.metadata.twitter);
    this.updateJsonLd(route.metadata.jsonLd);
  }

  private updateAlternateLinks(alternatives: Record<string, string>): void {
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
    
    for (const [locale, href] of Object.entries(alternatives).sort()) {
      const link = document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', locale);
      link.setAttribute('href', href);
      document.head.appendChild(link);
    }
  }

  private updateOgTags(og?: Record<string, string>): void {
    document.querySelectorAll('meta[property^="og:"]').forEach(el => el.remove());
    
    if (og) {
      for (const [property, value] of Object.entries(og)) {
        const meta = document.createElement('meta');
        meta.setAttribute('property', `og:${property}`);
        meta.setAttribute('content', value);
        document.head.appendChild(meta);
      }
    }
  }

  private updateTwitterTags(twitter?: Record<string, string>): void {
    document.querySelectorAll('meta[name^="twitter:"]').forEach(el => el.remove());
    
    if (twitter) {
      for (const [name, value] of Object.entries(twitter)) {
        const meta = document.createElement('meta');
        meta.setAttribute('name', `twitter:${name}`);
        meta.setAttribute('content', value);
        document.head.appendChild(meta);
      }
    }
  }

  private updateJsonLd(jsonLd?: unknown): void {
    document.querySelectorAll('script[type="application/ld+json"]').forEach(el => el.remove());
    
    if (jsonLd) {
      const script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }

  getCurrentPath(): string {
    return this.currentPath;
  }

  getCurrentPageContext(): SerializedPageContext | null {
    return this.currentPageContext;
  }

  navigate(path: string): void {
    this.navigation.navigate(path);
  }

  destroy(): void {
    this.navigation.destroy();
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}

export function createRenderController(options: RenderControllerOptions): RenderController {
  return new RenderController(options);
}