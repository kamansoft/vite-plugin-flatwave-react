import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as ReactHelmet from 'react-helmet-async';
import type { HelmetServerState } from 'react-helmet-async';
import { FlatwaveMDPageComponent } from '../react/FlatwaveMDPageComponent.js';

const { HelmetProvider } = (ReactHelmet as unknown as { default: typeof ReactHelmet }).default;

describe('DefaultRenderStrategy with FlatwaveMDPageComponent', () => {
  it('renders FlatwaveMDPageComponent to string with main and markdown body', async () => {
    const frontmatter = {
      title: 'Test Page',
      slug: 'test',
      id: 'test',
      public: true,
      description: 'Test description',
      canonical: '/test',
    };

    const markdownHtml = '<p>This is <strong>test</strong> content.</p>';
    const locale = 'en';

    const helmetContext: { helmet?: HelmetServerState } = {};
    const html = renderToString(
      <HelmetProvider context={helmetContext}>
        <FlatwaveMDPageComponent
          frontmatter={frontmatter}
          markdownHtml={markdownHtml}
          locale={locale}
        />
      </HelmetProvider>
    );

    // Without markdown prop, Helmet is not rendered (head tags handled by SSG)
    expect(html).toContain('<main>');
    expect(html).toContain('This is <strong>test</strong> content.');
  });

  it('renders without title when frontmatter has no title', async () => {
    const frontmatter = {
      title: '',
      slug: 'test',
      id: 'test',
      public: true,
    };

    const markdownHtml = '<p>No title page</p>';
    const locale = 'en';

    const helmetContext: { helmet?: HelmetServerState } = {};
    const html = renderToString(
      <HelmetProvider context={helmetContext}>
        <FlatwaveMDPageComponent
          frontmatter={frontmatter}
          markdownHtml={markdownHtml}
          locale={locale}
        />
      </HelmetProvider>
    );

    expect(html).toContain('<main>');
    expect(html).toContain('No title page');
  });

  it('renders loading fallback when no markdownHtml or markdown provided', async () => {
    const frontmatter = {
      title: 'Test Page',
      slug: 'test',
      id: 'test',
      public: true,
    };

    const helmetContext: { helmet?: HelmetServerState } = {};
    const html = renderToString(
      <HelmetProvider context={helmetContext}>
        <FlatwaveMDPageComponent
          frontmatter={frontmatter}
          markdownHtml={undefined}
          markdown={undefined}
          locale="en"
          loadingFallback={<div>Loading...</div>}
        />
      </HelmetProvider>
    );

    expect(html).toContain('Loading...');
  });
});
