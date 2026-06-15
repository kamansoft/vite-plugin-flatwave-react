import type { FlatwaveVirtualContent } from 'virtual:flatwave/content';

export function SimplePage({ content }: { content: FlatwaveVirtualContent }) {
  return (
    <article>
      <h1>{content.frontmatter.title as string}</h1>
      {content.frontmatter.description ? <p>{String(content.frontmatter.description)}</p> : null}
    </article>
  );
}
