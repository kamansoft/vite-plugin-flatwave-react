import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TemplateVariables, TemplateOverrides } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, 'templates');

const DEFAULT_TEMPLATES = {
  'index.html': 'index.html.ejs',
  'entry-client.tsx': 'entry-client.tsx.ejs',
  'entry-server.tsx': 'entry-server.tsx.ejs',
} as const;

export function resolveTemplate(name: string, overrides?: TemplateOverrides): string {
  if (overrides) {
    const overrideKey = name.replace('.', '-') as keyof TemplateOverrides;
    if (overrides[overrideKey]) {
      return readFileSync(resolve(overrides[overrideKey]!), 'utf-8');
    }
  }

  const projectRoot = process.cwd();
  const projectTemplate = join(projectRoot, 'flatwave-templates', name);
  try {
    return readFileSync(projectTemplate, 'utf-8');
  } catch {
    const builtInTemplate = join(
      TEMPLATES_DIR,
      DEFAULT_TEMPLATES[name as keyof typeof DEFAULT_TEMPLATES] || `${name}.ejs`
    );
    return readFileSync(builtInTemplate, 'utf-8');
  }
}

export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template
    .replace(/<%= appHtml %>/g, variables.appHtml)
    .replace(/<%= title %>/g, variables.title)
    .replace(/<%= meta %>/g, variables.meta)
    .replace(/<%= locale %>/g, variables.locale)
    .replace(/<%= canonical %>/g, variables.canonical)
    .replace(/<%= headTags %>/g, variables.headTags)
    .replace(
      /<%= scripts %>/g,
      variables.assets.scripts
        .map((src) => `<script type="module" crossorigin src="${src}"></script>`)
        .join('\n')
    )
    .replace(
      /<%= styles %>/g,
      variables.assets.styles.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n')
    );
}
