import type { FlatwaveFrontmatter, FlatwaveRoute } from '../types.js';

export interface FlatwaveMDComponentProps<TFrontmatter = FlatwaveFrontmatter> {
  frontmatter: TFrontmatter;
  markdownHtml?: string;
  markdown?: string;
  locale: string;
  className?: string;
  style?: React.CSSProperties;
  children?: (rendered: React.ReactNode, frontmatter: TFrontmatter) => React.ReactNode;
}

export interface FlatwaveMDPageProps<
  TFrontmatter = FlatwaveFrontmatter,
> extends FlatwaveMDComponentProps<TFrontmatter> {
  pageWrapper?: React.ComponentType<{
    children: React.ReactNode;
    frontmatter: TFrontmatter;
    locale: string;
  }>;
  loadingFallback?: React.ReactNode;
}

export interface FlatwaveLanguageContextValue {
  locale: string;
  supportedLanguages: string[];
  defaultLanguage: string;
}

export interface FlatwaveLanguageRouterProps {
  supportedLanguages: string[];
  defaultLanguage: string;
  onLanguageChange?: (lang: string) => void;
  renderPage: (route: FlatwaveRoute, lang: string) => React.ReactNode;
  dynamicRoute?: {
    path: string;
    renderPage: (params: { slug: string; lang: string }) => React.ReactNode;
  };
  layoutWrapper?: React.ComponentType<{ children: React.ReactNode; locale: string }>;
}

export interface FlatwaveLanguageDetectorProps {
  supportedLanguages: string[];
  defaultLanguage: string;
  onLanguageChange?: (lang: string) => void;
  children: React.ReactNode;
}

export interface FlatwaveAppRoutesProps {
  routes?: FlatwaveRoute[];
  renderPage: (route: FlatwaveRoute, lang: string) => React.ReactNode;
  layoutWrapper?: React.ComponentType<{ children: React.ReactNode; locale: string }>;
}

// Utility type for frontmatter extension
export type FlatwaveFrontmatterWith<T> = FlatwaveFrontmatter & T;
