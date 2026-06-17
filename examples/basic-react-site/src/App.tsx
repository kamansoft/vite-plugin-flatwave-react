import { useFlatwaveRoute } from 'vite-plugin-flatwave-react/render-loop';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ProgramPage } from './components/ProgramPage';
import { SimplePage } from './components/SimplePage';

export function App({ pageContext }: { pageContext: { locale: string; content: any; route: any } }) {
  const { content } = pageContext;

  const Component = content.component === 'ProgramPage' ? ProgramPage : SimplePage;

  return (
    <main>
      <LanguageSwitcher currentLocale={content.locale} contentId={content.id} />
      <Component content={content} />
      <MarkdownRenderer>{content.body}</MarkdownRenderer>
    </main>
  );
}