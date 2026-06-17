export interface PageContext {
  locale: string;
  content: import('../types').FlatwaveContentEntry;
  route: import('../types').FlatwaveRoute;
}

export interface NavigationState {
  currentPath: string;
  previousPath: string | null;
  pendingNavigation: string | null;
  isNavigating: boolean;
}

export interface RouterOptions {
  basePath?: string;
  scrollToTop?: boolean;
  onNavigate?: (path: string) => void;
}
