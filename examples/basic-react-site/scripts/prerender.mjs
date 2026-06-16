import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.resolve(projectRoot, 'dist');
const ssrDir = path.resolve(projectRoot, 'dist-ssr');
const contentDir = path.resolve(projectRoot, 'src/content');

async function prerender() {
  console.log('Starting pre-rendering...');

  const ssrEntryPath = path.resolve(ssrDir, 'entry-server.js');
  let ssrModule;
  try {
    ssrModule = await import(ssrEntryPath);
  } catch (error) {
    console.error('Failed to load SSR bundle:', error);
    process.exit(1);
  }

  const { render } = ssrModule;

  const routeManifestPath = path.resolve(distDir, 'route-manifest.json');
  const routeManifest = JSON.parse(await readFile(routeManifestPath, 'utf-8'));

  const indexHtmlPath = path.resolve(distDir, 'index.html');
  const indexHtml = await readFile(indexHtmlPath, 'utf-8');

  const assets = extractAssets(indexHtml);
  const contentMap = await buildContentMap();

  for (const route of routeManifest) {
    console.log(`Pre-rendering ${route.path}...`);

    try {
      const content = contentMap.get(`${route.locale}:${route.contentId}`);
      if (!content) {
        console.warn(`  Content not found for ${route.locale}:${route.contentId}`);
        continue;
      }

      const pageContext = {
        locale: route.locale,
        content,
        route,
        components: {},
      };

      const appHtml = await render(route.path, pageContext);
      const fullHtml = injectPreRenderedHtml(indexHtml, appHtml, route, assets);
      
      const fileName = route.path.replace(/^\//, '').replace(/\/$/, '') + '/index.html';
      const outputPath = path.resolve(distDir, fileName);
      
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, fullHtml);
      
      console.log(`  ${fileName}`);
    } catch (error) {
      console.error(`  Failed to pre-render ${route.path}:`, error);
    }
  }

  console.log('Pre-rendering complete!');
}

async function buildContentMap() {
  const contentMap = new Map();
  const locales = ['es', 'pt'];

  for (const locale of locales) {
    const localeDir = path.resolve(contentDir, locale);
    try {
      const files = await readdir(localeDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filePath = path.resolve(localeDir, file);
        const source = await readFile(filePath, 'utf-8');
        const parsed = matter(source);
        const frontmatter = parsed.data;
        const id = String(frontmatter.id || path.basename(file, '.md'));
        const slug = String(frontmatter.slug || path.basename(file, '.md'));
        const route = `/${locale}/${slug === 'index' ? '' : slug}`;
        
        contentMap.set(`${locale}:${id}`, {
          id,
          locale,
          slug,
          path: route,
          file: filePath,
          component: frontmatter.component ? String(frontmatter.component) : 'SimplePage',
          public: frontmatter.public !== false,
          attributes: frontmatter,
          frontmatter,
          body: parsed.content.trim(),
          route,
          alternatives: {},
        });
      }
    } catch {
      // Locale dir might not exist
    }
  }

  return contentMap;
}

function extractAssets(html) {
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"[^>]*>/g)].map((match) => match[1]);
  const styles = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css)"[^>]*>/g)].map((match) => match[1]);
  return { scripts, styles };
}

function injectPreRenderedHtml(template, preRenderedHtml, route, assets) {
  const scripts = assets.scripts.map((src) => `<script type="module" crossorigin src="${src}"></script>`).join('\n');
  const styles = assets.styles.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n');

  const fullHtml = preRenderedHtml
    .replace('</head>', `${styles}\n</head>`)
    .replace('</body>', `${scripts}\n</body>`);

  return fullHtml;
}

prerender();