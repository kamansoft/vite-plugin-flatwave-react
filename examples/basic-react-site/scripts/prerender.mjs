import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPrerenderer } from 'vite-plugin-flatwave-react/render/server';
import { buildIndex } from 'vite-plugin-flatwave-react/content/indexer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.resolve(projectRoot, 'dist');

async function prerender() {
  console.log('Starting pre-rendering...');

  const options = {
    contentDir: path.resolve(projectRoot, 'src/content'),
    locales: ['es', 'pt'],
    defaultLocale: 'es',
    template: path.resolve(projectRoot, 'index.html'),
    ssrEntry: path.resolve(projectRoot, 'dist-ssr/entry-server.js'),
    prerender: true,
  };

  const index = await buildIndex(options);
  const prerenderer = await createPrerenderer(options, index);
  
  const results = await prerenderer.prerender(distDir);
  
  for (const { path: fileName, html } of results) {
    const outputPath = path.resolve(distDir, fileName);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html);
    console.log(`  ${fileName}`);
  }

  console.log('Pre-rendering complete!');
}

prerender();