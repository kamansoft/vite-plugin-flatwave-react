/// <reference path="../virtual.d.ts" />
import { getAllContent, getAlternatives, getContent, getLocale, getLocales, getRoutes } from 'virtual:flatwave/content';
export declare function useFlatwaveContent(id: string, locale?: string): import("virtual:flatwave/content").FlatwaveVirtualContent | undefined;
export declare function useFlatwaveRoutes(locale?: string): import("virtual:flatwave/content").FlatwaveVirtualRoute[];
export declare function useFlatwaveAlternatives(id: string, currentLocale?: string): Record<string, string>;
export declare function useFlatwaveLocales(): string[];
export declare function useFlatwaveLocale(locale?: string): string | undefined;
export { getAllContent, getAlternatives, getContent, getLocale, getLocales, getRoutes };
