import { describe, it, expect, beforeEach } from 'vitest';
import { filterRoutesForPrerender } from '../../../src/render/page.js';
import type { FlatwaveRoute, NormalizedOptions } from '../../../src/types.js';

describe('prerender/renderer', () => {
  let mockRoutes: FlatwaveRoute[];

  beforeEach(() => {
    mockRoutes = [
      {
        locale: 'es',
        path: '/es/',
        contentId: 'index',
        component: 'SimplePage',
        metadata: { title: 'Inicio', description: 'Página de inicio' },
        frontmatter: { title: 'Inicio', slug: 'index', id: 'index', component: 'SimplePage' },
        alternatives: { pt: '/pt/' },
      },
      {
        locale: 'es',
        path: '/es/about',
        contentId: 'about',
        component: 'SimplePage',
        metadata: { title: 'Acerca de', description: 'Página acerca de' },
        frontmatter: { title: 'Acerca de', slug: 'about', id: 'about', component: 'SimplePage' },
        alternatives: { pt: '/pt/about' },
      },
      {
        locale: 'es',
        path: '/es/program',
        contentId: 'program',
        component: 'ProgramPage',
        metadata: { title: 'Programa', description: 'Página del programa' },
        frontmatter: {
          title: 'Programa',
          slug: 'program',
          id: 'program',
          component: 'ProgramPage',
        },
        alternatives: { pt: '/pt/program' },
      },
      {
        locale: 'pt',
        path: '/pt/',
        contentId: 'index',
        component: 'SimplePage',
        metadata: { title: 'Início', description: 'Página inicial' },
        frontmatter: { title: 'Início', slug: 'index', id: 'index', component: 'SimplePage' },
        alternatives: { es: '/es/' },
      },
    ];
  });

  describe('filterRoutesForPrerender', () => {
    it('should return all routes when prerender is true', () => {
      const options: NormalizedOptions['prerender'] = true;
      const result = filterRoutesForPrerender(mockRoutes, options);
      expect(result).toHaveLength(4);
    });

    it('should return all routes when prerender is empty object', () => {
      const options: NormalizedOptions['prerender'] = {};
      const result = filterRoutesForPrerender(mockRoutes, options);
      expect(result).toHaveLength(4);
    });

    it('should filter routes by exclude patterns', () => {
      const options: NormalizedOptions['prerender'] = {
        exclude: ['/es/program', '/pt/*'],
      };
      const result = filterRoutesForPrerender(mockRoutes, options);
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.path)).toEqual(['/es/', '/es/about']);
    });

    it('should filter routes by explicit routes array', () => {
      const options: NormalizedOptions['prerender'] = {
        routes: ['/es/', '/es/about'],
      };
      const result = filterRoutesForPrerender(mockRoutes, options);
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.path)).toEqual(['/es/', '/es/about']);
    });

    it('should filter routes by function', () => {
      const options: NormalizedOptions['prerender'] = {
        routes: (routes) => routes.filter((r) => r.locale === 'es').map((r) => r.path),
      };
      const result = filterRoutesForPrerender(mockRoutes, options);
      expect(result).toHaveLength(3);
      expect(result.every((r) => r.locale === 'es')).toBe(true);
    });

    it('should return empty array when prerender is false', () => {
      const options: NormalizedOptions['prerender'] = false;
      const result = filterRoutesForPrerender(mockRoutes, options);
      expect(result).toHaveLength(0);
    });

    it('should return empty array when prerender is undefined', () => {
      const options: NormalizedOptions['prerender'] = undefined;
      const result = filterRoutesForPrerender(mockRoutes, options);
      expect(result).toHaveLength(0);
    });
  });
});
