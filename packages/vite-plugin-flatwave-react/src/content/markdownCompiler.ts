import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeRaw from 'rehype-raw';
import type { Processor } from 'unified';

export interface MarkdownCompilerOptions {
  remarkPlugins?: Array<Parameters<Processor['use']>[0]>;
  rehypePlugins?: Array<Parameters<Processor['use']>[0]>;
  allowRawHtml?: boolean;
}

export async function compileMarkdownToHtml(
  markdown: string,
  options: MarkdownCompilerOptions = {}
): Promise<string> {
  const { remarkPlugins = [], rehypePlugins = [], allowRawHtml = false } = options;

  const processor = unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: allowRawHtml })
    .use(rehypeStringify);

  if (allowRawHtml) {
    processor.use(rehypeRaw);
  }

  for (const plugin of remarkPlugins) {
    processor.use(plugin);
  }

  for (const plugin of rehypePlugins) {
    processor.use(plugin);
  }

  const result = await processor.process(markdown);
  return String(result);
}
