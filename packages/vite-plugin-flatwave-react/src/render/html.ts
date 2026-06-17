import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { renderHtmlHead } from '../seo/metadata.js';
import type { FlatwaveRoute, FlatwaveContentEntry } from '../types';

export interface TemplateAssets {
  scripts: string[];
  styles: string[];
}

export async function loadTemplate(templatePath?: string): Promise<string> {
  if (templatePath) {
    const absolutePath = path.resolve(templatePath);
    return readFile(absolutePath, 'utf-8');
  }

  const defaultPath = path.resolve('index.html');
  try {
    return await readFile(defaultPath, 'utf-8');
  } catch {
    return `<!doctype html>
<html lang="{{locale}}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  {{head}}
</head>
<body>
  <div id="root">{{appHtml}}</div>
  {{scripts}}
</body>
</html>`;
  }
}

export function extractAssets(html: string | undefined): TemplateAssets {
  if (!html) return { scripts: [], styles: [] };
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"[^>]*>/g)].map((match) => match[1]);
  const styles = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css)"[^>]*>/g)].map((match) => match[1]);
  return { scripts, styles };
}

export function injectPageContextScript(html: string, pageContext: unknown): string {
  const script = `<script id="flatwave-page-context" type="application/json">${JSON.stringify(pageContext)}</script>`;
  return html.replace('</body>', `${script}\n</body>`);
}

export function injectPreRenderedHtml(
  template: string,
  preRenderedHtml: string,
  route: { locale: string; metadata: { title: string; canonical?: string } },
  assets: TemplateAssets
): string {
  const scripts = assets.scripts.map((src) => `<script type="module" crossorigin src="${src}"></script>`).join('\n');
  const styles = assets.styles.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n');

  const fullHtml = preRenderedHtml
    .replace('</head>', `${styles}\n</head>`)
    .replace('</body>', `${scripts}\n</body>`);

  return fullHtml;
}

export function renderHtmlShell(
  template: string,
  route: { locale: string; metadata: { title: string; canonical?: string } },
  assets: TemplateAssets,
  appHtml?: string
): string {
  const scripts = assets.scripts.map((src) => `<script type="module" crossorigin src="${src}"></script>`).join('\n');
  const styles = assets.styles.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n');

  let result = template
    .replace(/{{scripts}}/g, scripts)
    .replace(/{{styles}}/g, styles)
    .replace(/{{locale}}/g, route.locale)
    .replace(/{{title}}/g, route.metadata.title)
    .replace(/{{head}}/g, '');

  if (appHtml) {
    result = result.replace(/{{appHtml}}/g, appHtml);
  }

  return result;
}

export function renderRouteHtml(
  route: FlatwaveRoute,
  assets: TemplateAssets,
  content?: FlatwaveContentEntry
): string {
  const scripts = assets.scripts.map((src) => `<script type="module" crossorigin src="${src}"></script>`).join('\n');
  const styles = assets.styles.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n');
  const title = route.metadata.title;
  const description = route.metadata.description ? route.metadata.description : title;

  return `<!doctype html>
<html lang="${route.locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${route.metadata.canonical ?? route.path}">
  ${styles}
  ${renderHtmlHead(route)}
</head>
<body>
  <div id="root"></div>
  ${scripts}
</body>
</html>
`;
}