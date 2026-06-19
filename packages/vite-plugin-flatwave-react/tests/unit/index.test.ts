import { describe, it, expect, beforeEach } from 'vitest';
import { flatwaveContent } from '../../src/index.js';
import type { FlatwaveContentOptions } from '../../src/types.js';

describe('flatwaveContent plugin', () => {
  let mockOptions: FlatwaveContentOptions;

  beforeEach(() => {
    mockOptions = {
      contentDir: '/test/content',
      locales: ['es', 'pt'],
      defaultLocale: 'es',
      componentsDir: '/test/components',
    };
  });

  it('should return array of plugins', async () => {
    const plugins = await flatwaveContent(mockOptions);
    expect(Array.isArray(plugins)).toBe(true);
    expect(plugins.length).toBeGreaterThanOrEqual(3);
  });

  it('should include content plugin', async () => {
    const plugins = await flatwaveContent(mockOptions);
    const contentPlugin = plugins.find((p) => p.name === 'flatwave-react:content');
    expect(contentPlugin).toBeDefined();
    expect(contentPlugin?.enforce).toBe('pre');
  });

  it('should include markdown plugin', async () => {
    const plugins = await flatwaveContent(mockOptions);
    const markdownPlugin = plugins.find((p) => p.name === 'flatwave-react:markdown');
    expect(markdownPlugin).toBeDefined();
    expect(markdownPlugin?.enforce).toBe('pre');
  });

  it('should include ssg plugin', async () => {
    const plugins = await flatwaveContent(mockOptions);
    const ssgPlugin = plugins.find((p) => p.name === 'flatwave-react:ssg');
    expect(ssgPlugin).toBeDefined();
  });

  it('should include prerender plugin', async () => {
    const plugins = await flatwaveContent({ ...mockOptions, prerender: true });
    const prerenderPlugin = plugins.find((p) => p.name === 'flatwave-react:prerender');
    expect(prerenderPlugin).toBeDefined();
  });

  it('should normalize options with defaults', async () => {
    const plugins = await flatwaveContent(mockOptions);
    expect(plugins).toBeDefined();
  });

  it('should throw when defaultLocale not in locales', async () => {
    await expect(
      flatwaveContent({
        ...mockOptions,
        defaultLocale: 'fr',
        locales: ['es', 'pt'],
      })
    ).rejects.toThrow("defaultLocale 'fr' must be included in locales.");
  });
});
