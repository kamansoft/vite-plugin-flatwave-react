import type { FlatwaveVirtualContent } from 'virtual:flatwave/content';

export function ProgramPage({ content }: { content: FlatwaveVirtualContent }) {
  return (
    <article>
      <h1>{content.frontmatter.title as string}</h1>
      {content.frontmatter.description ? <p>{String(content.frontmatter.description)}</p> : null}
      {content.frontmatter.date ? (
        <time dateTime={String(content.frontmatter.date)}>{String(content.frontmatter.date)}</time>
      ) : null}
    </article>
  );
}
