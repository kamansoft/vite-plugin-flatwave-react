import { useMemo } from 'react';
import { getRoutes, getContent } from 'virtual:flatwave/content';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ProgramPage } from './components/ProgramPage';
import { SimplePage } from './components/SimplePage';

export function App() {
  const locale = useMemo(() => window.location.pathname.split('/')[1] || 'es', []);
  const path = window.location.pathname.replace(/\/$/, '') || `/${locale}`;
  const routes = getRoutes(locale);
  const route = routes.find((item) => item.path === path) ?? routes[0];
  const content = route ? getRouteContent(route.contentId, locale) : undefined;

  if (!content) {
    return <main>Content not found</main>;
  }

  const Component = content.component === 'ProgramPage' ? ProgramPage : SimplePage;

  return (
    <main>
      <LanguageSwitcher currentLocale={content.locale} contentId={content.id} />
      <Component content={content} />
      <MarkdownRenderer>{content.body}</MarkdownRenderer>
    </main>
  );
}

function getRouteContent(contentId: string, locale: string) {
  return getContent(contentId, locale);
}
