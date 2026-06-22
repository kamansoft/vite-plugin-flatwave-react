import { isPublicEntry, normalizeSlug } from './scanner.js';
export function buildContentIndex(entries) {
    const byId = {};
    const byLocale = {};
    const routes = [];
    for (const entry of entries) {
        if (!entry.public)
            continue;
        byId[entry.id] ??= {};
        byLocale[entry.locale] ??= {};
        byId[entry.id][entry.locale] = entry;
        byLocale[entry.locale][entry.id] = entry;
    }
    for (const id of Object.keys(byId).sort()) {
        const locales = Object.keys(byId[id]).sort();
        const alternatives = buildAlternatives(locales, (locale) => byId[id][locale]?.route ?? '');
        for (const locale of locales) {
            const entry = byId[id][locale];
            if (!entry)
                continue;
            routes.push({
                locale: entry.locale,
                path: entry.route,
                contentId: entry.id,
                metadata: buildSeoMetadata(entry.frontmatter, entry.route, entry.locale),
                frontmatter: entry.frontmatter,
                alternatives,
            });
        }
    }
    routes.sort((a, b) => `${a.locale}${a.path}`.localeCompare(`${b.locale}${b.path}`));
    return {
        entries: entries.filter((entry) => entry.public),
        byId,
        byLocale,
        routes,
    };
}
function buildAlternatives(locales, getRoute) {
    const alternatives = {};
    for (const locale of locales) {
        const route = getRoute(locale);
        if (route)
            alternatives[locale] = route;
    }
    return alternatives;
}
function buildSeoMetadata(frontmatter, route, _locale) {
    return {
        title: String(frontmatter.title || ''),
        description: frontmatter.description ? String(frontmatter.description) : undefined,
        canonical: frontmatter.canonical ? String(frontmatter.canonical) : route,
        image: frontmatter.image ? String(frontmatter.image) : undefined,
        robots: frontmatter.robots ? String(frontmatter.robots) : 'index, follow',
        keywords: Array.isArray(frontmatter.keywords) ? frontmatter.keywords.map(String) : undefined,
        jsonLd: frontmatter.jsonLd,
        og: recordValue(frontmatter.og),
        twitter: recordValue(frontmatter.twitter),
    };
}
function recordValue(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return undefined;
    const record = {};
    for (const [key, item] of Object.entries(value)) {
        if (item !== undefined && item !== null)
            record[key] = String(item);
    }
    return Object.keys(record).length > 0 ? record : undefined;
}
export function routeFromLocaleAndSlug(locale, slug) {
    return `/${locale}${normalizeSlug(slug)}`;
}
export function isPublicFrontmatter(frontmatter) {
    return isPublicEntry(frontmatter);
}
