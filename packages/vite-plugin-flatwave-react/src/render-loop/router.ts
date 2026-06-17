import type { RouterOptions, NavigationState } from './types';

export class PathnameRouter {
  private basePath: string;
  private listeners: Set<(state: NavigationState) => void> = new Set();

  constructor(options: RouterOptions = {}) {
    this.basePath = options.basePath ?? '';
  }

  getCurrentPath(): string {
    const path = window.location.pathname;
    // Remove basePath if present
    if (this.basePath && path.startsWith(this.basePath)) {
      return path.slice(this.basePath.length) || '/';
    }
    return path;
  }

  navigate(path: string, options: RouterOptions = {}): void {
    const normalized = this.normalizePath(path);
    
    // Don't navigate if already on this path
    if (this.getCurrentPath() === normalized) return;

    const state: NavigationState = {
      currentPath: normalized,
      previousPath: this.getCurrentPath(),
      pendingNavigation: null,
      isNavigating: true,
    };

    // Update URL
    const url = this.basePath + normalized;
    window.history.pushState({}, '', url);

    // Notify listeners
    this.notifyListeners(state);

    options.onNavigate?.(normalized);
  }

  replace(path: string, options: RouterOptions = {}): void {
    const normalized = this.normalizePath(path);
    const url = this.basePath + normalized;
    window.history.replaceState({}, '', url);

    const state: NavigationState = {
      currentPath: normalized,
      previousPath: this.getCurrentPath(),
      pendingNavigation: null,
      isNavigating: false,
    };

    this.notifyListeners(state);
    options.onNavigate?.(normalized);
  }

  private normalizePath(path: string): string {
    // Ensure path starts with /
    if (!path.startsWith('/')) path = '/' + path;
    // Remove trailing slash (except for root)
    if (path !== '/' && path.endsWith('/')) path = path.slice(0, -1);
    return path;
  }

  private notifyListeners(state: NavigationState): void {
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  subscribe(listener: (state: NavigationState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getBasePath(): string {
    return this.basePath;
  }
}
