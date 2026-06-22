import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = process.cwd();
const pluginWorkspace = '@kamansoft/vite-plugin-flatwave-react';
const exampleWorkspace = '@flatwave/example-basic-react-site';
const exampleDist = path.resolve(root, 'examples/basic-react-site/dist');
let serve: ChildProcessWithoutNullStreams | undefined;

async function waitForServe(): Promise<void> {
  const deadline = Date.now() + 20_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:4173/es/program');
      if (response.ok) return;
      lastError = new Error(`serve returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Serve server did not become ready: ${String(lastError)}`);
}

describe('Flatwave example e2e', () => {
  beforeAll(() => {
    execFileSync('npm', ['run', 'build', '-w', pluginWorkspace], { cwd: root, stdio: 'pipe' });
    execFileSync('npm', ['run', 'build', '-w', exampleWorkspace], { cwd: root, stdio: 'pipe' });
    serve = spawn('npx', ['serve', 'dist', '-l', '4173'], {
      cwd: path.resolve(root, 'examples/basic-react-site'),
      stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '0' },
    });
  }, 120_000);

  afterAll(() => {
    serve?.kill();
  });

  it('builds the plugin and example static site', () => {
    expect(
      existsSync(path.resolve(root, 'packages/vite-plugin-flatwave-react/dist/index.js'))
    ).toBe(true);
    expect(existsSync(path.resolve(exampleDist, 'index.html'))).toBe(true);
  });

  it('generates locale-prefixed static HTML routes', () => {
    const routes = [
      'es/index.html',
      'es/about/index.html',
      'es/program/index.html',
      'pt/index.html',
      'pt/about/index.html',
      'pt/program/index.html',
    ];

    for (const route of routes) {
      expect(existsSync(path.resolve(exampleDist, route))).toBe(true);
    }

    const aboutHtml = readFileSync(path.resolve(exampleDist, 'es/about/index.html'), 'utf-8');
    expect(aboutHtml).toContain('<html lang="es">');
    expect(aboutHtml).toContain('<title>Acerca de</title>');
    expect(aboutHtml).toContain('Acerca de');
  });

  it('generates sitemap and robots from the route inventory', () => {
    const sitemap = readFileSync(path.resolve(exampleDist, 'sitemap.xml'), 'utf-8');
    const robots = readFileSync(path.resolve(exampleDist, 'robots.txt'), 'utf-8');
    const manifest = JSON.parse(
      readFileSync(path.resolve(exampleDist, 'route-manifest.json'), 'utf-8')
    ) as Array<{ locale: string; path: string }>;

    expect(manifest).toHaveLength(6);
    expect(manifest.map((route) => route.path)).toEqual(
      expect.arrayContaining(['/es/about', '/pt/program'])
    );
    expect(sitemap).toContain('<loc>http://localhost:4173/es/about</loc>');
    expect(robots).toContain('Sitemap: http://localhost:4173/sitemap.xml');
  });

  it('serves localized routes from the static server', async () => {
    await waitForServe();

    const response = await fetch('http://127.0.0.1:4173/es/program');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('<html lang="es">');
    expect(html).toContain('<title>Programa</title>');
  });

  it('runs the standalone validation CLI', () => {
    const output = execFileSync(
      'node',
      [
        'packages/vite-plugin-flatwave-react/dist/cli/validate.js',
        '--content-dir',
        'examples/basic-react-site/src/content',
        '--locales',
        'es,pt',
        '--default-locale',
        'es',
      ],
      { cwd: root, encoding: 'utf-8' }
    );

    expect(output).toContain('Flatwave validation passed');
  });
});
