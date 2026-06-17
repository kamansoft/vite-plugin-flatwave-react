import type { Plugin } from 'vite';
import type { FlatwaveContentIndex, FlatwaveContentOptions, NormalizedOptions } from './types';
export declare function flatwaveContent(options: FlatwaveContentOptions): Promise<Plugin[]>;
export declare function createPrerenderPlugin(options: NormalizedOptions, index: FlatwaveContentIndex): Promise<Plugin>;
export default flatwaveContent;
