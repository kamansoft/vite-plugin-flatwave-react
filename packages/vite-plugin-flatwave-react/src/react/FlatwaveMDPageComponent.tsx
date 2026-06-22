import React from 'react';
import * as ReactHelmet from 'react-helmet-async';
import type { FlatwaveMDPageProps } from './types.js';
import { FlatwaveMDComponent } from './FlatwaveMDComponent.js';

const { Helmet, HelmetProvider } = (ReactHelmet as unknown as { default: typeof ReactHelmet })
  .default;

export { HelmetProvider };

interface FrontmatterSeo {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  robots?: string;
  og?: { title?: string; description?: string };
}

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

  // SEO Head tags via react-helmet-async (only for client-side rendering when markdown is used)
  // For SSG (markdownHtml provided), head tags are handled by renderHtmlHead in runSsg
  const fm = frontmatter as FrontmatterSeo | undefined;
  const title = typeof fm?.title === 'string' ? fm.title : undefined;
  // Only render Helmet when in client-side mode (markdown provided, no markdownHtml)
  const headTags =
    markdown !== undefined && title ? (
      <Helmet>
        <title>{title}</title>
        {typeof fm?.description === 'string' && (
          <meta name="description" content={fm.description} />
        )}
        {typeof fm?.canonical === 'string' && <link rel="canonical" href={fm.canonical} />}
        {typeof fm?.og?.title === 'string' && <meta property="og:title" content={fm.og.title} />}
        {typeof fm?.og?.description === 'string' && (
          <meta property="og:description" content={fm.og.description} />
        )}
        {typeof fm?.image === 'string' && <meta property="og:image" content={fm.image} />}
        {typeof fm?.robots === 'string' && <meta name="robots" content={fm.robots} />}
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
