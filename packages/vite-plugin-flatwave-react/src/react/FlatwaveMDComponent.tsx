import React from 'react';
import * as ReactMarkdown from 'react-markdown';
import type { FlatwaveMDComponentProps, FlatwaveLanguageContextValue } from './types.js';
import { FlatwaveLanguageContext } from './FlatwaveLanguageContext.js';

const ReactMarkdownComponent = ReactMarkdown.default;

function stripYamlFrontmatter(markdown: string): string {
  return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
}

export function FlatwaveMDComponent(props: FlatwaveMDComponentProps): React.ReactElement | null {
  const { frontmatter, markdownHtml, markdown, locale, className, style, children } = props;

  let renderedContent: React.ReactNode = null;

  // Priority: markdownHtml > markdown
  if (markdownHtml !== undefined) {
    // SSG mode: use pre-compiled HTML
    renderedContent = (
      <div dangerouslySetInnerHTML={{ __html: markdownHtml }} className={className} style={style} />
    );
  } else if (markdown !== undefined) {
    // Client-side mode: render with react-markdown
    const strippedMarkdown = stripYamlFrontmatter(markdown);
    renderedContent = (
      <ReactMarkdownComponent
        components={{
          p: ({ ...props }) => <p style={{ marginBottom: '1em' }} {...props} />,
        }}
      >
        {strippedMarkdown}
      </ReactMarkdownComponent>
    );
  }

  // Provide locale context
  const contextValue: FlatwaveLanguageContextValue = {
    locale,
    supportedLanguages: [],
    defaultLanguage: '',
  };

  const wrappedContent = (
    <FlatwaveLanguageContext.Provider value={contextValue}>
      {children ? children(renderedContent, frontmatter) : renderedContent}
    </FlatwaveLanguageContext.Provider>
  );

  // Apply className/style to outer wrapper if no children
  if (!children && (className || style)) {
    return (
      <div className={className} style={style}>
        {wrappedContent}
      </div>
    );
  }

  return wrappedContent;
}

export type { FlatwaveMDComponentProps } from './types.js';
