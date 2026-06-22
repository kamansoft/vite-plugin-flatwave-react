import React from 'react';
import * as ReactRouter from 'react-router-dom';
import type { FlatwaveLanguageContextValue } from './types.js';
import { FlatwaveLanguageContext } from './FlatwaveLanguageContext.js';

const useNavigate = ReactRouter.useNavigate;
const useLocation = ReactRouter.useLocation;

export interface FlatwaveLanguageSelectorProps {
  renderOption?: (lang: string, label: string, isActive: boolean) => React.ReactNode;
  onSelect?: (lang: string) => void;
  getLabel?: (lang: string) => string;
  className?: string;
  style?: React.CSSProperties;
}

export function FlatwaveLanguageSelector({
  renderOption,
  onSelect,
  getLabel,
  className,
  style,
}: FlatwaveLanguageSelectorProps): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const context = React.useContext(FlatwaveLanguageContext);

  const { locale, supportedLanguages } = context as FlatwaveLanguageContextValue;

  const handleSelect = (lang: string) => {
    onSelect?.(lang);

    // Navigate to the selected language version of current path
    const currentPath = location.pathname;
    // Remove current language prefix
    const pathWithoutLang = supportedLanguages.reduce(
      (path, currentLang) => path.replace(`/${currentLang}`, '') || '/',
      currentPath
    );
    // Add new language prefix
    navigate(`/${lang}${pathWithoutLang === '/' ? '' : pathWithoutLang}`, { replace: true });
  };

  const defaultGetLabel = (lang: string) => lang;
  const getLabelFn = getLabel || defaultGetLabel;

  if (renderOption) {
    return (
      <div className={className} style={style}>
        {supportedLanguages.map((lang) => renderOption(lang, getLabelFn(lang), locale === lang))}
      </div>
    );
  }

  // Default select element
  return (
    <select
      value={locale}
      onChange={(e) => handleSelect(e.target.value)}
      className={className}
      style={style}
    >
      {supportedLanguages.map((lang) => (
        <option key={lang} value={lang}>
          {getLabelFn(lang)}
        </option>
      ))}
    </select>
  );
}
