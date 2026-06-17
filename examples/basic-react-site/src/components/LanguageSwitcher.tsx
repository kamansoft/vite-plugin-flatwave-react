import { getAlternatives } from 'virtual:flatwave/content';

export function LanguageSwitcher({
  currentLocale,
  contentId,
}: {
  currentLocale: string;
  contentId: string;
}) {
  const alternatives = getAlternatives(contentId, currentLocale);

  return (
    <nav aria-label="Language switcher">
      {Object.entries(alternatives).map(([locale, path]) => (
        <a key={locale} href={path}>
          {locale}
        </a>
      ))}
    </nav>
  );
}
