import { renderToString } from 'react-dom/server';
import * as ReactHelmet from 'react-helmet-async';
import type { HelmetServerState } from 'react-helmet-async';
import type { RenderStrategy, RenderContext } from './types.js';
import { FlatwaveMDPageComponent } from '../react/FlatwaveMDPageComponent.js';

const { HelmetProvider } = (ReactHelmet as unknown as { default: typeof ReactHelmet }).default;

export class DefaultRenderStrategy implements RenderStrategy {
  async render(context: RenderContext): Promise<string> {
    const { contentEntry, route } = context;

    const markdownHtml = contentEntry.body;
    const frontmatter = contentEntry.frontmatter;
    const locale = route.locale;

    try {
      const helmetContext: { helmet?: HelmetServerState } = {};
      const appHtml = renderToString(
        <HelmetProvider context={helmetContext}>
          <FlatwaveMDPageComponent
            frontmatter={frontmatter}
            markdownHtml={markdownHtml}
            locale={locale}
          />
        </HelmetProvider>
      );

      // Return only the body HTML - head tags are extracted via renderHtmlHead in runSsg
      return appHtml;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `<p data-ssg-error>Render error: ${message}</p>`;
    }
  }
}
