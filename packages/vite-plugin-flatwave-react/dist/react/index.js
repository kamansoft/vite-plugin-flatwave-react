import { useMemo } from 'react';
import { getAllContent, getAlternatives, getContent, getLocale, getLocales, getRoutes, } from 'virtual:flatwave/content';
export function useFlatwaveContent(id, locale) {
    return useMemo(() => getContent(id, locale), [id, locale]);
}
export function useFlatwaveRoutes(locale) {
    return useMemo(() => getRoutes(locale), [locale]);
}
export function useFlatwaveAlternatives(id, currentLocale) {
    return useMemo(() => getAlternatives(id, currentLocale), [id, currentLocale]);
}
export function useFlatwaveLocales() {
    return useMemo(() => getLocales(), []);
}
export function useFlatwaveLocale(locale) {
    return useMemo(() => getLocale(locale), [locale]);
}
export { getAllContent, getAlternatives, getContent, getLocale, getLocales, getRoutes };
