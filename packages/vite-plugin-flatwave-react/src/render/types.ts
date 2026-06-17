export type RenderMode = 'server' | 'client';

export interface SerializedPageContext {
  locale: string;
  route: import('../types').FlatwaveRoute;
  content: import('../types').FlatwaveContentEntry;
}

export interface RenderControllerOptions {
  root: Element;
  App: React.ComponentType<{ pageContext: SerializedPageContext }>;
  basePath?: string;
  scrollToTop?: boolean;
}

export interface NavigationEvent {
  path: string;
  previousPath: string | null;
  type: 'push' | 'replace' | 'popstate';
}

export interface RouteInventory {
  routes: import('../types').FlatwaveRoute[];
  content: import('../types').FlatwaveContentEntry[];
}