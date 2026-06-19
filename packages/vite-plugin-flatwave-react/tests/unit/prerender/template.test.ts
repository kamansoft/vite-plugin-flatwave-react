import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadTemplate,
  extractAssets,
  injectPreRenderedHtml,
  injectIntoTemplate,
} from '../../../src/render/html.js';
import * as fs from 'node:fs/promises';

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
  },
  readFile: vi.fn(),
}));

describe('prerender/template', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractAssets', () => {
    it('should extract scripts and styles from HTML', () => {
      const html = `
        <html>
          <head>
            <link rel="stylesheet" href="/assets/style.css">
            <link rel="stylesheet" href="/assets/theme.css">
          </head>
          <body>
            <script type="module" src="/assets/app.js"></script>
            <script type="module" src="/assets/vendor.js"></script>
          </body>
        </html>
      `;
      const assets = extractAssets(html);
      expect(assets.styles).toEqual(['/assets/style.css', '/assets/theme.css']);
      expect(assets.scripts).toEqual(['/assets/app.js', '/assets/vendor.js']);
    });

    it('should return empty arrays when no assets found', () => {
      const html = '<html><head></head><body></body></html>';
      const assets = extractAssets(html);
      expect(assets.styles).toEqual([]);
      expect(assets.scripts).toEqual([]);
    });
  });

  describe('injectPreRenderedHtml', () => {
    it('should inject styles before </head> and scripts before </body>', () => {
      const template = `<html><head><title>Test</title></head><body><div id="root"></div></body></html>`;
      const preRendered = `<html lang="en"><head><meta charset="UTF-8"><title>Test</title></head><body><div id="root"><h1>Content</h1></div></body></html>`;
      const assets = { scripts: ['/assets/app.js'], styles: ['/assets/style.css'] };

      const result = injectPreRenderedHtml(
        template,
        preRendered,
        { locale: 'en', metadata: { title: 'Test' } },
        assets
      );

      expect(result).toContain('<link rel="stylesheet" href="/assets/style.css">');
      expect(result).toContain('<script type="module" crossorigin src="/assets/app.js"></script>');
      expect(result).toContain('<h1>Content</h1>');
    });
  });

  describe('injectIntoTemplate', () => {
    it('should replace placeholders with provided values', () => {
      const template = `{{locale}} {{title}} {{head}} {{appHtml}} {{scripts}} {{styles}}`;
      const assets = { scripts: ['/assets/app.js'], styles: ['/assets/style.css'] };

      const result = injectIntoTemplate(
        template,
        '<div>App Content</div>',
        { locale: 'es', metadata: { title: 'Test Page' } },
        assets
      );

      expect(result).toContain('es');
      expect(result).toContain('Test Page');
      expect(result).toContain('<div>App Content</div>');
      expect(result).toContain('/assets/app.js');
      expect(result).toContain('/assets/style.css');
    });
  });

  describe('loadTemplate', () => {
    it('should load custom template when path provided', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('<html>Custom Template</html>');
      const result = await loadTemplate('/custom/template.html');
      expect(result).toBe('<html>Custom Template</html>');
      expect(fs.readFile).toHaveBeenCalledWith('/custom/template.html', 'utf-8');
    });

    it('should load default index.html when exists', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('<html>Default Template</html>');
      const result = await loadTemplate(undefined);
      expect(result).toBe('<html>Default Template</html>');
    });

    it('should return fallback template when index.html not found', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Not found'));
      const result = await loadTemplate(undefined);
      expect(result).toContain('{{appHtml}}');
      expect(result).toContain('{{scripts}}');
      // Note: fallback template doesn't have {{styles}} placeholder
      expect(result).toContain('<div id="root">{{appHtml}}</div>');
      expect(result).toContain('{{scripts}}');
    });
  });
});
