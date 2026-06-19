/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderToString } from 'react-dom/server';

import type { FlatwaveRoute, FlatwaveContentEntry } from 'vite-plugin-flatwave-react/types';

interface PageContext {
  locale: string;
  content: FlatwaveContentEntry;
  route: FlatwaveRoute;
  components: Record<string, React.ComponentType<any>>;
}

const components: Record<string, React.ComponentType<any>> = {};

export function registerComponent(name: string, component: React.ComponentType<any>) {
  components[name] = component;
}

export async function render(url: string, pageContext: PageContext): Promise<string> {
  const { route, content, locale, components: componentRegistry } = pageContext;

  const Component = componentRegistry[content.component] || (() => null);

  const App = () => (
    <html lang={locale}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{route.metadata.title}</title>
        {route.metadata.description && (
          <meta name="description" content={route.metadata.description} />
        )}
        <link rel="canonical" href={route.metadata.canonical ?? route.path} />
        {renderHtmlHead(route)}
      </head>
      <body>
        <div id="root">
          <Component content={content} />
          <div dangerouslySetInnerHTML={{ __html: content.body }} />
        </div>
      </body>
    </html>
  );

  return renderToString(<App />);
}

function renderHtmlHead(route: FlatwaveRoute): string {
  const metadata = route.metadata;
  const tags: string[] = [];

  if (metadata.robots) tags.push(`<meta name="robots" content="${metadata.robots}">`);
  if (metadata.canonical) tags.push(`<link rel="canonical" href="${metadata.canonical}">`);
  if (metadata.image) {
    tags.push(`<meta property="og:image" content="${metadata.image}">`);
    tags.push(`<meta name="twitter:image" content="${metadata.image}">`);
  }

  for (const [locale, alternate] of Object.entries(route.alternatives).sort()) {
    tags.push(`<link rel="alternate" hreflang="${locale}" href="${alternate}">`);
  }

  for (const [property, value] of Object.entries(metadata.og ?? {})) {
    tags.push(`<meta property="og:${property}" content="${value}">`);
  }

  for (const [name, value] of Object.entries(metadata.twitter ?? {})) {
    tags.push(`<meta name="twitter:${name}" content="${value}">`);
  }

  if (metadata.jsonLd) {
    tags.push(
      `<script type="application/ld+json">${escapeJsonScript(JSON.stringify(metadata.jsonLd))}</script>`
    );
  }

  return tags.join('\n  ');
}

function escapeJsonScript(value: string): string {
  return value
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

if (import.meta.hot) {
  import.meta.hot.accept();
}
