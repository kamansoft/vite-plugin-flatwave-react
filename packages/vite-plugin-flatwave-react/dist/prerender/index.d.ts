import type { Plugin } from 'vite';
import type { FlatwaveContentIndex, NormalizedOptions } from '../types';
export declare function createPrerenderPlugin(options: NormalizedOptions, index: FlatwaveContentIndex): Promise<Plugin>;
export declare function createPrerenderer(options: NormalizedOptions, index: FlatwaveContentIndex): Promise<{
    prerender(outputDir: string): Promise<{
        path: string;
        html: string;
    }[]>;
}>;
