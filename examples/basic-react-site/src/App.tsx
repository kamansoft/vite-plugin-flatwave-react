import {
  FlatwaveLanguageRouter,
  FlatwaveMDPageComponent,
  useFlatwaveRoutes,
  useFlatwaveContent,
} from '@kamansoft/vite-plugin-flatwave-react/react';
import type { FlatwaveFrontmatter } from '@kamansoft/vite-plugin-flatwave-react/types';
import type { FlatwaveVirtualRoute } from 'virtual:flatwave/content';

export function App() {
  const routes = useFlatwaveRoutes();

  return (
    <FlatwaveLanguageRouter
      supportedLanguages={['es', 'pt']}
      defaultLanguage="es"
      routes={routes}
      renderPage={(route: FlatwaveVirtualRoute, lang: string) => {
        const content = useFlatwaveContent(route.contentId, lang);
        return (
          <FlatwaveMDPageComponent
            frontmatter={route.frontmatter as FlatwaveFrontmatter}
            markdownHtml={content?.body}
            locale={lang}
          />
        );
      }}
    />
  );
}
