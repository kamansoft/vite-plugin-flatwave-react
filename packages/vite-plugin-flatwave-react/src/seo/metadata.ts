import type { FlatwaveRoute, SeoMetadata } from '../types';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function escapeXml(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

export function renderHtmlHead(route: FlatwaveRoute): string {
  const metadata = route.metadata;
  const tags: string[] = [];

  if (metadata.description)
    tags.push(`<meta name="description" content="${escapeHtml(metadata.description)}">`);
  if (metadata.robots) tags.push(`<meta name="robots" content="${escapeHtml(metadata.robots)}">`);
  if (metadata.canonical)
    tags.push(`<link rel="canonical" href="${escapeHtml(metadata.canonical)}">`);
  if (metadata.image) {
    tags.push(`<meta property="og:image" content="${escapeHtml(metadata.image)}">`);
    tags.push(`<meta name="twitter:image" content="${escapeHtml(metadata.image)}">`);
  }

  for (const [locale, alternate] of Object.entries(route.alternatives).sort()) {
    tags.push(
      `<link rel="alternate" hreflang="${escapeHtml(locale)}" href="${escapeHtml(alternate)}">`
    );
  }

  for (const [property, value] of Object.entries(metadata.og ?? {})) {
    tags.push(`<meta property="og:${escapeHtml(property)}" content="${escapeHtml(value)}">`);
  }

  for (const [name, value] of Object.entries(metadata.twitter ?? {})) {
    tags.push(`<meta name="twitter:${escapeHtml(name)}" content="${escapeHtml(value)}">`);
  }

  if (metadata.jsonLd) {
    tags.push(
      `<script type="application/ld+json">${escapeJsonScript(JSON.stringify(metadata.jsonLd))}</script>`
    );
  }

  return tags.join('\n  ');
}

export function escapeJsonScript(value: string): string {
  return value
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function buildSeoMetadata(metadata: SeoMetadata): string {
  const route = {
    locale: '',
    path: metadata.canonical ?? '/',
    contentId: '',
    metadata,
    frontmatter: {} as FlatwaveRoute['frontmatter'],
    alternatives: {},
  } satisfies FlatwaveRoute;

  return renderHtmlHead(route);
}
