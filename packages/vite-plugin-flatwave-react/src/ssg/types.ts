import type { FlatwaveRoute, FlatwaveContentEntry } from '../types.js';
import type { RenderPipeline } from './RenderPipeline.js';

export type { RenderPipeline } from './RenderPipeline.js';
export type { RenderHooks, TemplateOverrides, RenderStrategy } from '../types.js';

export interface RenderContext {
  route: FlatwaveRoute;
  contentEntry: FlatwaveContentEntry;
  components: Map<string, unknown>;
  assets: { scripts: string[]; styles: string[] };
  hooks: RenderPipeline;
  options: import('../types.js').SsgOptions;
  locale: string;
  allRoutes: FlatwaveRoute[];
}

export type TemplateVariables = {
  appHtml: string;
  title: string;
  meta: string;
  assets: { scripts: string[]; styles: string[] };
  locale: string;
  canonical: string;
  headTags: string;
};
