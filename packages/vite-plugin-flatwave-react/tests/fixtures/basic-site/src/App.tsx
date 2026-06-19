import { useMemo } from 'react';
import { getRoutes, getContent } from 'virtual:flatwave/content';
import { SimplePage } from './components/SimplePage';

export function App() {
  const locale = useMemo(() => window.location.pathname.split('/')[1] || 'es', []);
  const path = window.location.pathname.replace(/\/$/, '') || `/${locale}`;
  const routes = getRoutes(locale);
  const route = routes.find((item) => item.path === path) ?? routes[0];
  const content = route ? getContent(route.contentId, locale) : undefined;

  if (!content) {
    return <main>Content not found</main>;
  }

  const Component = content.component === 'ProgramPage' ? SimplePage : SimplePage;

  return (
    <main>
      <Component content={content} />
    </main>
  );
}
