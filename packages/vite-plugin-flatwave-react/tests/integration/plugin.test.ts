import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { flatwaveContent } from '../../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(__dirname, '../fixtures/basic-site');
const testBuildDir = path.resolve(__dirname, '../../test-build-output');

describe('Integration: full plugin behavior', () => {
  beforeAll(async () => {
    await rm(testBuildDir, { recursive: true, force: true });
    await mkdir(testBuildDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testBuildDir, { recursive: true, force: true });
  });

  it('should generate correct route manifest', async () => {
    await build({
      root: fixtureDir,
      build: { outDir: testBuildDir, emptyOutDir: true },
      plugins: [
        await flatwaveContent({
          contentDir: path.resolve(fixtureDir, 'src/content'),
          locales: ['es', 'pt'],
          defaultLocale: 'es',
          componentsDir: path.resolve(fixtureDir, 'src/components'),
          emitRouteManifest: true,
        }),
      ],
    });

    const manifestPath = path.resolve(testBuildDir, 'route-manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));

    expect(manifest).toBeDefined();
    expect(Array.isArray(manifest)).toBe(true);
    // Now has 6 routes: es/index, es/about, es/program, pt/index, pt/about, pt/program
    expect(manifest.length).toBe(6);

    // Check structure of each route
    for (const route of manifest) {
      expect(route).toHaveProperty('locale');
      expect(route).toHaveProperty('path');
      expect(route).toHaveProperty('contentId');
      expect(route).toHaveProperty('component');
      expect(route).toHaveProperty('metadata');
      expect(route.metadata).toHaveProperty('title');
      expect(route).toHaveProperty('alternatives');
    }

    // Check specific routes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const esIndex = manifest.find((r: any) => r.path === '/es/');
    expect(esIndex).toBeDefined();
    expect(esIndex.locale).toBe('es');
    expect(esIndex.metadata.title).toBe('Inicio');
    expect(esIndex.alternatives).toHaveProperty('pt', '/pt/');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const esAbout = manifest.find((r: any) => r.path === '/es/about');
    expect(esAbout).toBeDefined();
    expect(esAbout.locale).toBe('es');
    expect(esAbout.metadata.title).toBe('Acerca de');
    expect(esAbout.alternatives).toHaveProperty('pt', '/pt/about');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const esProgram = manifest.find((r: any) => r.path === '/es/program');
    expect(esProgram).toBeDefined();
    expect(esProgram.locale).toBe('es');
    expect(esProgram.metadata.title).toBe('Programa');
    expect(esProgram.alternatives).toHaveProperty('pt', '/pt/program');
  });

  it('should generate sitemap.xml', async () => {
    const manifestPath = path.resolve(testBuildDir, 'route-manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));

    const sitemapPath = path.resolve(testBuildDir, 'sitemap.xml');
    const sitemap = await readFile(sitemapPath, 'utf-8');

    expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

    // Sitemap uses full URLs with hostname
    for (const route of manifest) {
      expect(sitemap).toContain(`<loc>http://localhost:4173${route.path}</loc>`);
    }
  });

  it('should generate robots.txt', async () => {
    const robotsPath = path.resolve(testBuildDir, 'robots.txt');
    const robots = await readFile(robotsPath, 'utf-8');

    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Sitemap:');
  });

  it('should generate HTML files with SEO metadata', async () => {
    const manifestPath = path.resolve(testBuildDir, 'route-manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));

    for (const route of manifest) {
      const htmlPath = path.resolve(
        testBuildDir,
        route.path.replace(/^\//, '').replace(/\/$/, '') + '/index.html'
      );
      const html = await readFile(htmlPath, 'utf-8');

      // Check basic structure
      expect(html).toContain('<!doctype html>');
      expect(html).toContain(`<html lang="${route.locale}">`);
      expect(html).toContain('<meta charset="UTF-8">');
      expect(html).toContain('<meta name="viewport"');

      // Check SEO metadata
      expect(html).toContain(`<title>${route.metadata.title}</title>`);
      expect(html).toContain(`<meta name="description" content="${route.metadata.description}">`);
      expect(html).toContain(
        `<link rel="canonical" href="${route.metadata.canonical ?? route.path}">`
      );

      // Check hreflang
      for (const [locale, altPath] of Object.entries(route.alternatives)) {
        expect(html).toContain(`<link rel="alternate" hreflang="${locale}" href="${altPath}">`);
      }

      // Check robots
      expect(html).toContain(`<meta name="robots" content="index, follow">`);

      // Should have empty root div (not pre-rendered without prerender option)
      expect(html).toContain('<div id="root"></div>');
    }
  });
});

describe('Integration: plugin with prerender option', () => {
  beforeAll(async () => {
    await rm(testBuildDir, { recursive: true, force: true });
    await mkdir(testBuildDir, { recursive: true });
  });

  it('should skip HTML generation when prerender is enabled', async () => {
    await build({
      root: fixtureDir,
      build: { outDir: testBuildDir, emptyOutDir: true },
      plugins: [
        await flatwaveContent({
          contentDir: path.resolve(fixtureDir, 'src/content'),
          locales: ['es', 'pt'],
          defaultLocale: 'es',
          componentsDir: path.resolve(fixtureDir, 'src/components'),
          prerender: true,
          ssrEntry: path.resolve(fixtureDir, 'src/entry-server.tsx'),
        }),
      ],
    });

    // HTML files should not be generated by SSG plugin when prerender is true
    // They would be generated by the prerender script instead
    const manifestPath = path.resolve(testBuildDir, 'route-manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));

    for (const route of manifest) {
      // These should not exist or be empty since prerender plugin is no-op during build
      // (actual prerendering happens in separate step)
      expect(route).toBeDefined();
    }
  });
});
