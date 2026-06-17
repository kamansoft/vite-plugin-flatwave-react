import type { RouterOptions, NavigationState, PageContext } from './types';
import { PathnameRouter } from './router';

export class NavigationController {
  private router: PathnameRouter;
  private popstateHandler: () => void;
  private clickHandler: (e: MouseEvent) => void;
  private scrollPositions: Map<string, number> = new Map();

  constructor(options: RouterOptions = {}) {
    this.router = new PathnameRouter(options);
    
    // Handle browser back/forward
    this.popstateHandler = () => {
      this.handlePopState();
    };

    // Intercept link clicks
    this.clickHandler = (e: MouseEvent) => {
      this.handleLinkClick(e);
    };
  }

  start(onRender: (path: string, pageContext: PageContext) => void): void {
    // Listen for back/forward
    window.addEventListener('popstate', this.popstateHandler);
    
    // Intercept link clicks
    document.addEventListener('click', this.clickHandler);
    
    // Handle initial load
    const initialPath = this.router.getCurrentPath();
    onRender(initialPath, { locale: '', content: {} as any, route: {} as any });
  }

  stop(): void {
    window.removeEventListener('popstate', this.popstateHandler);
    document.removeEventListener('click', this.clickHandler);
  }

  navigate(path: string): void {
    this.saveScrollPosition();
    this.router.navigate(path);
  }

  private handlePopState(): void {
    const path = this.router.getCurrentPath();
    this.render(path);
  }

  private handleLinkClick(e: MouseEvent): void {
    const link = (e.target as HTMLElement).closest('a');
    if (!link) return;

    // Only handle same-origin links
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('//')) return;
    
    // Only handle pathname links (not hash-only links like #section)
    if (href.startsWith('#')) return;

    e.preventDefault();
    this.saveScrollPosition();
    this.router.navigate(href);
  }

  private saveScrollPosition(): void {
    const path = this.router.getCurrentPath();
    this.scrollPositions.set(path, window.scrollY);
  }

  private restoreScrollPosition(path: string): void {
    const saved = this.scrollPositions.get(path);
    if (saved !== undefined) {
      window.scrollTo(0, saved);
    } else {
      window.scrollTo(0, 0);
    }
  }

  private render(path: string): void {
    // This would be connected to the actual page rendering
    // For now, just restore scroll
    this.restoreScrollPosition(path);
  }
}
