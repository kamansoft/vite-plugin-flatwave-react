import React from 'react';
import * as ReactHelmet from 'react-helmet-async';
import type { FlatwaveMDPageProps } from './types.js';
import { FlatwaveMDComponent } from './FlatwaveMDComponent.js';

const Helmet = ReactHelmet.Helmet;

export function FlatwaveMDPageComponent(props: FlatwaveMDPageProps): React.ReactElement | null {
  const {
    frontmatter,
    markdownHtml,
    markdown,
    locale,
    className,
    style,
    children,
    pageWrapper,
    loadingFallback,
  } = props;

  // Handle missing content
  if (markdownHtml === undefined && markdown === undefined) {
    if (loadingFallback !== undefined) {
      return <>{loadingFallback}</>;
    }
    return null;
  }

  // Render page content
  const pageContent = (
    <FlatwaveMDComponent
      frontmatter={frontmatter}
      markdownHtml={markdownHtml}
      markdown={markdown}
      locale={locale}
      className={className}
      style={style}
      children={children}
    />
  );

  // SEO Head tags via react-helmet-async (client-side only)
  const fm = frontmatter || {};
  const title = typeof fm.title === 'string' ? fm.title : undefined;
  const headTags = title ? (
    <Helmet>
      <title>{title}</title>
      {typeof fm.description === 'string' && <meta name="description" content={fm.description} />}
      {typeof fm.canonical === 'string' && <link rel="canonical" href={fm.canonical} />}
      {fm.og && typeof fm.og.title === 'string' && (
        <meta property="og:title" content={fm.og.title} />
      )}
      {fm.og && typeof fm.og.description === 'string' && (
        <meta property="og:description" content={fm.og.description} />
      )}
      {typeof fm.image === 'string' && <meta property="og:image" content={fm.image} />}
      {typeof fm.robots === 'string' && <meta name="robots" content={fm.robots} />}
    </Helmet>
  ) : null;

  const contentWithHead = (
    <>
      {headTags}
      {pageContent}
    </>
  );

  // Apply layout wrapper
  if (pageWrapper) {
    const Wrapper = pageWrapper;
    return (
      <Wrapper frontmatter={frontmatter} locale={locale}>
        {contentWithHead}
      </Wrapper>
    );
  }

  // Default wrapper
  return <main>{contentWithHead}</main>;
}

export type { FlatwaveMDPageProps } from './types.js';
