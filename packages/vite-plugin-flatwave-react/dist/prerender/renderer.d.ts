import type { FlatwaveContentIndex, FlatwaveRoute, FlatwaveContentEntry, NormalizedOptions } from '../types';
export interface PageContext {
    locale: string;
    content: FlatwaveContentEntry;
    route: FlatwaveRoute;
    components: Record<string, React.ComponentType<any>>;
}
export interface Renderer {
    render(url: string, pageContext: PageContext): Promise<string>;
}
export declare function createRenderer(ssrEntry: string, index: FlatwaveContentIndex, componentRegistry: Record<string, React.ComponentType<any>>): Promise<Renderer>;
export declare function filterRoutesForPrerender(routes: FlatwaveRoute[], prerenderOptions: NormalizedOptions['prerender']): FlatwaveRoute[];
