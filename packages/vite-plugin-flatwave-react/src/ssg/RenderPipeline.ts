import type { RenderContext } from './types.js';
import type { RenderHooks, EmitFilesContext, SsgOutputFile } from '../types.js';

type HookPhase = keyof RenderHooks;

type BeforeRenderHook = NonNullable<RenderHooks['beforeRender']>;
type TransformMarkdownHook = NonNullable<RenderHooks['transformMarkdown']>;
type TransformHtmlHook = NonNullable<RenderHooks['transformHtml']>;
type AfterRenderHook = NonNullable<RenderHooks['afterRender']>;
type OnErrorHook = NonNullable<RenderHooks['onError']>;
type EmitFilesHook = NonNullable<RenderHooks['emitFiles']>;

export class RenderPipeline {
  private beforeRenderHooks: BeforeRenderHook[] = [];
  private transformMarkdownHooks: TransformMarkdownHook[] = [];
  private transformHtmlHooks: TransformHtmlHook[] = [];
  private afterRenderHooks: AfterRenderHook[] = [];
  private onErrorHooks: OnErrorHook[] = [];
  private emitFilesHooks: EmitFilesHook[] = [];

  constructor(initialHooks: Partial<RenderHooks> = {}) {
    if (initialHooks.beforeRender) this.beforeRenderHooks.push(initialHooks.beforeRender);
    if (initialHooks.transformMarkdown)
      this.transformMarkdownHooks.push(initialHooks.transformMarkdown);
    if (initialHooks.transformHtml) this.transformHtmlHooks.push(initialHooks.transformHtml);
    if (initialHooks.afterRender) this.afterRenderHooks.push(initialHooks.afterRender);
    if (initialHooks.onError) this.onErrorHooks.push(initialHooks.onError);
    if (initialHooks.emitFiles) this.emitFilesHooks.push(initialHooks.emitFiles);
  }

  addHook(phase: HookPhase, hook: unknown): void {
    const target = this.getHooks(phase);
    if (target) {
      target.push(hook as never);
    }
  }

  async executeBeforeRender(context: RenderContext): Promise<RenderContext> {
    let modified = context;
    for (const hook of this.beforeRenderHooks) {
      try {
        modified = (await hook(modified)) as RenderContext;
      } catch (error) {
        console.error(`[RenderPipeline] beforeRender hook failed:`, error);
      }
    }
    return modified;
  }

  async executeTransformMarkdown(markdown: string, context: RenderContext): Promise<string> {
    let transformed = markdown;
    for (const hook of this.transformMarkdownHooks) {
      try {
        transformed = await hook(transformed, context);
      } catch (error) {
        console.error(`[RenderPipeline] transformMarkdown hook failed:`, error);
      }
    }
    return transformed;
  }

  async executeTransformHtml(html: string, context: RenderContext): Promise<string> {
    let transformed = html;
    for (const hook of this.transformHtmlHooks) {
      try {
        transformed = await hook(transformed, context);
      } catch (error) {
        console.error(`[RenderPipeline] transformHtml hook failed:`, error);
      }
    }
    return transformed;
  }

  async executeAfterRender(html: string, context: RenderContext): Promise<void> {
    for (const hook of this.afterRenderHooks) {
      try {
        await hook(html, context);
      } catch (error) {
        console.error(`[RenderPipeline] afterRender hook failed:`, error);
      }
    }
  }

  async executeOnError(error: Error, context: RenderContext): Promise<string> {
    for (const hook of this.onErrorHooks) {
      try {
        return await hook(error, context);
      } catch (hookError) {
        console.error(`[RenderPipeline] onError hook failed:`, hookError);
      }
    }
    return `<p data-ssg-error>Render error: ${error.message}</p>`;
  }

  async executeEmitFiles(context: EmitFilesContext): Promise<SsgOutputFile[]> {
    const results: SsgOutputFile[] = [];
    for (const hook of this.emitFilesHooks) {
      try {
        const files = await hook(context);
        if (Array.isArray(files)) {
          results.push(...files);
        }
      } catch (error) {
        console.error(`[RenderPipeline] emitFiles hook failed:`, error);
      }
    }
    return results;
  }

  hasHooks(phase: HookPhase): boolean {
    const hooks = this.getHooks(phase);
    return hooks !== undefined && hooks.length > 0;
  }

  private getHooks(phase: HookPhase): unknown[] | undefined {
    switch (phase) {
      case 'beforeRender':
        return this.beforeRenderHooks as unknown[];
      case 'transformMarkdown':
        return this.transformMarkdownHooks as unknown[];
      case 'transformHtml':
        return this.transformHtmlHooks as unknown[];
      case 'afterRender':
        return this.afterRenderHooks as unknown[];
      case 'onError':
        return this.onErrorHooks as unknown[];
      case 'emitFiles':
        return this.emitFilesHooks as unknown[];
    }
  }
}
