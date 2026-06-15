import fg from 'fast-glob';
import path from 'node:path';
import matter from 'gray-matter';
export async function scanMarkdownFiles(contentDir, locales) {
    const files = [];
    for (const locale of locales) {
        const localeDir = path.resolve(contentDir, locale);
        const matches = await fg('**/*.md', {
            cwd: localeDir,
            onlyFiles: true,
            absolute: true,
            ignore: ['**/node_modules/**'],
        });
        for (const file of matches.sort()) {
            const source = await readFile(file);
            const parsed = matter(source);
            const frontmatter = parsed.data;
            const slug = normalizeSlug(String(frontmatter.slug || path.basename(file, '.md')));
            files.push({
                file,
                locale,
                slug,
                body: parsed.content.trim(),
                frontmatter,
            });
        }
    }
    return files;
}
async function readFile(file) {
    const fs = await import('node:fs/promises');
    return fs.readFile(file, 'utf-8');
}
export function normalizeSlug(slug) {
    return `/${slug.replace(/^\/+|\/+$/g, '')}`;
}
export function routeForLocaleSlug(locale, slug) {
    const normalized = normalizeSlug(slug);
    const isHome = normalized === '/' || normalized === '/index';
    return isHome ? `/${locale}/` : `/${locale}${normalized}`;
}
export function isPublicEntry(frontmatter) {
    if (typeof frontmatter.public === 'boolean')
        return frontmatter.public;
    return String(frontmatter.public ?? 'true').toLowerCase() !== 'false';
}
export function buildContentEntry(parsed, alternatives) {
    const route = routeForLocaleSlug(parsed.locale, parsed.slug);
    const attributes = { ...parsed.frontmatter };
    return {
        id: String(parsed.frontmatter.id || parsed.slug),
        locale: parsed.locale,
        slug: parsed.slug,
        path: route,
        file: parsed.file,
        component: parsed.frontmatter.component ? String(parsed.frontmatter.component) : undefined,
        public: isPublicEntry(parsed.frontmatter),
        attributes,
        frontmatter: parsed.frontmatter,
        body: parsed.body,
        route,
        alternatives,
    };
}
