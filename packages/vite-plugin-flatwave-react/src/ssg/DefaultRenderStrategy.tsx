import { renderToString } from 'react-dom/server';
import type { RenderStrategy, RenderContext } from './types.js';

export class DefaultRenderStrategy implements RenderStrategy {
  async render(context: RenderContext): Promise<string> {
    const { route, contentEntry, components, locale } = context;

    const componentModule = components.get(route.component || '');

    // contentEntry.body is already compiled HTML (set by runSsg before calling render)
    const compiledBody = contentEntry.body;

    if (!componentModule) {
      // Graceful degradation: component not found at build time is common when
      // consuming projects haven't pre-built their components. Serve compiled
      // markdown so the page still has meaningful content.
      console.warn(
        `[SSG] Component "${route.component}" not found for "${route.path}" — serving compiled markdown`
      );
      return compiledBody;
    }

    const Component = (componentModule as { default: React.ComponentType<Record<string, unknown>> })
      .default;
    if (!Component) {
      console.warn(
        `[SSG] Component "${route.component}" has no default export for "${route.path}" — serving compiled markdown`
      );
      return compiledBody;
    }

    // contentEntry.body is already compiled HTML — runSsg pre-compiles via
    // the transformMarkdown pipeline + compileMarkdownToHtml before calling render
    const props = {
      ...contentEntry.frontmatter,
      markdownHtml: contentEntry.body,
      locale,
      route: route.path,
    };

    try {
      const appHtml = renderToString(<Component {...props} />);
      return appHtml;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `<p data-ssg-error>Render error: ${message}</p>`;
    }
  }
}
