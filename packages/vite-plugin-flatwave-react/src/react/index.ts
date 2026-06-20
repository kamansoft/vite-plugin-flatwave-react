import { useMemo } from 'react';
import {
  getAllContent,
  getAlternatives,
  getContent,
  getLocale,
  getLocales,
  getRoutes,
} from 'virtual:flatwave/content';

// React hooks
export function useFlatwaveContent(id: string, locale?: string) {
  return useMemo(() => getContent(id, locale), [id, locale]);
}

export function useFlatwaveRoutes(locale?: string) {
  return useMemo(() => getRoutes(locale), [locale]);
}

export function useFlatwaveAlternatives(id: string, currentLocale?: string) {
  return useMemo(() => getAlternatives(id, currentLocale), [id, currentLocale]);
}

export function useFlatwaveLocales() {
  return useMemo(() => getLocales(), []);
}

export function useFlatwaveLocale(locale?: string) {
  return useMemo(() => getLocale(locale), [locale]);
}

// Re-export component props types
export type {
  FlatwaveMDComponentProps,
  FlatwaveMDPageProps,
  FlatwaveLanguageRouterProps,
  FlatwaveLanguageDetectorProps,
  FlatwaveAppRoutesProps,
  FlatwaveLanguageContextValue,
  FlatwaveFrontmatterWith,
} from './types.js';

// Re-export FlatwaveLanguageContext and useFlatwaveLanguage hook
export { FlatwaveLanguageContext, useFlatwaveLanguage } from './FlatwaveLanguageContext.js';

// Re-export component implementations
export { FlatwaveMDComponent } from './FlatwaveMDComponent.js';
export { FlatwaveMDPageComponent } from './FlatwaveMDPageComponent.js';
export { FlatwaveLanguageRouter } from './FlatwaveLanguageRouter.js';
export { FlatwaveLanguageDetector } from './FlatwaveLanguageDetector.js';
export { FlatwaveAppRoutes } from './FlatwaveAppRoutes.js';
export { FlatwaveLanguageSelector } from './FlatwaveLanguageSelector.js';

// Re-export virtual module utilities
export { getAllContent, getAlternatives, getContent, getLocale, getLocales, getRoutes };
