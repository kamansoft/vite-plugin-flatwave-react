import { useMemo } from 'react';
import {
  getAllContent,
  getAlternatives,
  getContent,
  getLocale,
  getLocales,
  getRoutes,
} from 'virtual:flatwave/content';

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

export { getAllContent, getAlternatives, getContent, getLocale, getLocales, getRoutes };
