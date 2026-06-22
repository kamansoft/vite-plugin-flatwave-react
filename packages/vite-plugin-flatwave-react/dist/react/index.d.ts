/// <reference path="../virtual.d.ts" />
import { getAllContent, getAlternatives, getContent, getLocale, getLocales, getRoutes } from 'virtual:flatwave/content';
export declare function useFlatwaveContent(id: string, locale?: string): import("virtual:flatwave/content").FlatwaveVirtualContent | undefined;
export declare function useFlatwaveRoutes(locale?: string): import("virtual:flatwave/content").FlatwaveVirtualRoute[];
export declare function useFlatwaveAlternatives(id: string, currentLocale?: string): Record<string, string>;
export declare function useFlatwaveLocales(): string[];
export declare function useFlatwaveLocale(locale?: string): string | undefined;
export type { FlatwaveMDComponentProps, FlatwaveMDPageProps, FlatwaveLanguageRouterProps, FlatwaveLanguageDetectorProps, FlatwaveAppRoutesProps, FlatwaveLanguageContextValue, FlatwaveFrontmatterWith, } from './types.js';
export { FlatwaveLanguageContext, useFlatwaveLanguage } from './FlatwaveLanguageContext.js';
export { FlatwaveMDComponent } from './FlatwaveMDComponent.js';
export { FlatwaveMDPageComponent } from './FlatwaveMDPageComponent.js';
export { FlatwaveLanguageRouter } from './FlatwaveLanguageRouter.js';
export { FlatwaveLanguageDetector } from './FlatwaveLanguageDetector.js';
export { FlatwaveAppRoutes } from './FlatwaveAppRoutes.js';
export { FlatwaveLanguageSelector } from './FlatwaveLanguageSelector.js';
export { getAllContent, getAlternatives, getContent, getLocale, getLocales, getRoutes };
