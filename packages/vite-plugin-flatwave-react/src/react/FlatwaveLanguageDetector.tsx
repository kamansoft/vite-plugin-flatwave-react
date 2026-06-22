import React from 'react';
import * as ReactRouter from 'react-router-dom';
import type { FlatwaveLanguageDetectorProps } from './types.js';
import { FlatwaveLanguageContext } from './FlatwaveLanguageContext.js';

const useNavigate = ReactRouter.useNavigate;
const useLocation = ReactRouter.useLocation;

export function FlatwaveLanguageDetector({
  supportedLanguages,
  defaultLanguage,
  onLanguageChange,
  children,
}: FlatwaveLanguageDetectorProps): React.ReactElement | null {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentLocale, setCurrentLocale] = React.useState('' as string);

  React.useEffect(() => {
    const currentPath = location.pathname;
    const pathSegments = currentPath.split('/').filter(Boolean);
    const firstSegment = pathSegments[0];

    // Check if the first segment is a language code
    const isLanguageInPath = supportedLanguages.includes(firstSegment);

    if (isLanguageInPath) {
      // Language is already in the path
      if (currentLocale !== firstSegment) {
        setCurrentLocale(firstSegment);
        onLanguageChange?.(firstSegment);
      }
    } else {
      // No language in path, detect and redirect
      const browserLang = navigator.language.split('-')[0];
      const targetLang = supportedLanguages.includes(browserLang) ? browserLang : defaultLanguage;

      // Navigate with language prefix
      navigate(`/${targetLang}${currentPath}`, { replace: true });
      onLanguageChange?.(targetLang);
    }
  }, [
    location.pathname,
    navigate,
    supportedLanguages,
    defaultLanguage,
    onLanguageChange,
    currentLocale,
  ]);

  const contextValue = {
    locale: currentLocale,
    supportedLanguages,
    defaultLanguage,
  };

  return (
    <FlatwaveLanguageContext.Provider value={contextValue}>
      {children}
    </FlatwaveLanguageContext.Provider>
  );
}
