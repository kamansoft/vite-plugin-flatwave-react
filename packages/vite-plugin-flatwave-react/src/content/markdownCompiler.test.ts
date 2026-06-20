import { describe, it, expect } from 'vitest';
import { compileMarkdownToHtml } from './markdownCompiler.js';

describe('compileMarkdownToHtml', () => {
  it('compiles basic markdown to HTML', async () => {
    const result = await compileMarkdownToHtml('# Hello\n\nWorld');
    expect(result).toContain('<h1>Hello</h1>');
    expect(result).toContain('<p>World</p>');
  });

  it('handles raw HTML when allowRawHtml is true', async () => {
    const result = await compileMarkdownToHtml('<div>raw</div>', { allowRawHtml: true });
    expect(result).toContain('<div>raw</div>');
  });

  it('strips raw HTML by default', async () => {
    const result = await compileMarkdownToHtml('<div>raw</div>');
    expect(result).not.toContain('<div>raw</div>');
  });

  it('handles code blocks', async () => {
    const result = await compileMarkdownToHtml('```js\nconst x = 1;\n```');
    expect(result).toContain('<pre><code class="language-js">const x = 1;\n</code></pre>');
  });

  it('handles links', async () => {
    const result = await compileMarkdownToHtml('[link](https://example.com)');
    expect(result).toContain('<a href="https://example.com">link</a>');
  });

  it('handles emphasis', async () => {
    const result = await compileMarkdownToHtml('**bold** and *italic*');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
  });
});
