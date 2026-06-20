import React from 'react';
import type { FlatwaveLanguageContextValue } from './types.js';

export const FlatwaveLanguageContext = React.createContext<FlatwaveLanguageContextValue>({
  locale: '',
  supportedLanguages: [],
  defaultLanguage: '',
});

export type { FlatwaveLanguageContextValue } from './types.js';

export function useFlatwaveLanguage() {
  return React.useContext(FlatwaveLanguageContext);
}
