declare module 'virtual:flatwave/content' {
  export interface FlatwaveVirtualContent {
    id: string;
    locale: string;
    slug: string;
    path: string;
    file: string;
    component?: string;
    public: boolean;
    attributes: Record<string, unknown>;
    frontmatter: Record<string, unknown>;
    body: string;
    route: string;
    alternatives: Record<string, string>;
  }

  export interface FlatwaveVirtualRoute {
    locale: string;
    path: string;
    contentId: string;
    component?: string;
    metadata: Record<string, unknown>;
    frontmatter: Record<string, unknown>;
    alternatives: Record<string, string>;
  }

  export function getContent(id: string, locale?: string): FlatwaveVirtualContent | undefined;
  export function getAllContent(): FlatwaveVirtualContent[];
  export function getRoutes(locale?: string): FlatwaveVirtualRoute[];
  export function getAlternatives(
    contentId: string,
    currentLocale?: string
  ): Record<string, string>;
  export function getLocale(locale?: string): string | undefined;
  export function getLocales(): string[];
  export function getDefaultLocale(): string;
  export const flatwaveContentIndex: {
    entries: FlatwaveVirtualContent[];
    routes: FlatwaveVirtualRoute[];
  };
}

declare module 'vite-plugin-flatwave-react/render-loop' {
  export interface SerializedPageContext {
    locale: string;
    route: import('./types').FlatwaveRoute;
    content: import('./types').FlatwaveContentEntry;
  }

  export interface RenderControllerOptions {
    root: Element;
    App: React.ComponentType<{ pageContext: SerializedPageContext }>;
    basePath?: string;
    scrollToTop?: boolean;
  }

  export type StartRenderLoopOptions = RenderControllerOptions;

  export interface RenderController {
    getCurrentPath(): string;
    getCurrentPageContext(): SerializedPageContext | null;
    destroy(): void;
  }

  export function startRenderLoop(options: StartRenderLoopOptions): RenderController;
  export function destroyRenderLoop(): void;
  export function getRenderController(): RenderController | null;
  export function getCurrentPath(): string;
  export function navigateTo(path: string): void;
  export function onNavigate(callback: (path: string) => void): () => void;
  export function getPageContext(): SerializedPageContext | null;
  export function useFlatwaveRoute(): import('./types').FlatwaveRoute | undefined;
}
