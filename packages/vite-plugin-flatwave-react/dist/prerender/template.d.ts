export interface TemplateAssets {
    scripts: string[];
    styles: string[];
}
export declare function loadTemplate(templatePath?: string): Promise<string>;
export declare function extractAssets(html: string): TemplateAssets;
export declare function injectIntoTemplate(template: string, appHtml: string, route: {
    locale: string;
    metadata: {
        title: string;
        canonical?: string;
    };
}, assets: TemplateAssets): string;
export declare function injectPreRenderedHtml(template: string, preRenderedHtml: string, route: {
    locale: string;
    metadata: {
        title: string;
        canonical?: string;
    };
}, assets: TemplateAssets): string;
