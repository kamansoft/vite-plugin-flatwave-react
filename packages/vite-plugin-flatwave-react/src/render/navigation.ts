import { getRoutes } from 'virtual:flatwave/content';

export interface NavigationOptions {
  basePath?: string;
  onNavigate?: (path: string) => void;
  onPopState?: (path: string) => void;
}

export class Navigation {
  private basePath: string;
  private onNavigate: ((path: string) => void) | undefined;
  private onPopState: ((path: string) => void) | undefined;
  private popstateHandler: ((event: PopStateEvent) => void) | null = null;
  private clickHandler: ((event: MouseEvent) => void) | null = null;
  private isStarted = false;

  constructor(options: NavigationOptions = {}) {
    this.basePath = options.basePath ?? '';
    this.onNavigate = options.onNavigate;
    this.onPopState = options.onPopState;
  }

  start(): void {
    if (this.isStarted) return;

    this.popstateHandler = () => this.handlePopState();
    this.clickHandler = (e: MouseEvent) => this.handleLinkClick(e);

    window.addEventListener('popstate', this.popstateHandler);
    document.addEventListener('click', this.clickHandler, true);

    this.isStarted = true;
  }

  destroy(): void {
    if (!this.isStarted) return;

    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler);
      this.popstateHandler = null;
    }

    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, true);
      this.clickHandler = null;
    }

    this.isStarted = false;
  }

  navigate(path: string): void {
    const normalized = this.normalizePath(path);
    const currentPath = this.getCurrentPath();

    if (currentPath === normalized) return;

    if (!this.validateRoute(normalized)) {
      console.warn(`[flatwave] Navigation rejected: unknown route "${normalized}"`);
      return;
    }

    const url = this.basePath + normalized;
    window.history.pushState({}, '', url);

    this.onNavigate?.(normalized);
  }

  replace(path: string): void {
    const normalized = this.normalizePath(path);
    const url = this.basePath + normalized;
    window.history.replaceState({}, '', url);
    this.onNavigate?.(normalized);
  }

  getCurrentPath(): string {
    const path = window.location.pathname;
    if (this.basePath && path.startsWith(this.basePath)) {
      return path.slice(this.basePath.length) || '/';
    }
    return path;
  }

  private handlePopState(): void {
    const path = this.getCurrentPath();
    this.onPopState?.(path);
  }

  private handleLinkClick(event: MouseEvent): void {
    const link = (event.target as HTMLElement).closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    if (this.shouldIgnoreLink(link, href)) return;

    event.preventDefault();
    this.navigate(href);
  }

  private shouldIgnoreLink(link: HTMLAnchorElement, href: string): boolean {
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
      return true;
    }

    if (href.startsWith('#')) {
      return true;
    }

    if (href.startsWith('mailto:') || href.startsWith('tel:')) {
      return true;
    }

    if (link.hasAttribute('target')) {
      return true;
    }

    if (link.hasAttribute('download')) {
      return true;
    }

    if (
      href.endsWith('.pdf') ||
      href.endsWith('.zip') ||
      href.endsWith('.doc') ||
      href.endsWith('.docx')
    ) {
      return true;
    }

    return false;
  }

  private normalizePath(path: string): string {
    if (!path.startsWith('/')) path = '/' + path;
    if (path !== '/' && path.endsWith('/')) path = path.slice(0, -1);
    return path;
  }

  private validateRoute(path: string): boolean {
    const routes = getRoutes();
    return routes.some((r) => r.path === path);
  }
}
