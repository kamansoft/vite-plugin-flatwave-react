import type { FlatwaveRoute, SeoMetadata } from '../types';
export declare function escapeHtml(value: string): string;
export declare function escapeXml(value: string): string;
export declare function renderHtmlHead(route: FlatwaveRoute): string;
export declare function escapeJsonScript(value: string): string;
export declare function buildSeoMetadata(metadata: SeoMetadata): string;
