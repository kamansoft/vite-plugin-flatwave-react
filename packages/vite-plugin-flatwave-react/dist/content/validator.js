import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { routeForLocaleSlug, scanMarkdownFiles } from './scanner.js';
import { buildContentIndex } from './routeBuilder.js';
export async function validateContent(options) {
    const errors = [];
    const warnings = [];
    const requiredFields = options.requiredFields ?? ['title', 'slug', 'id', 'component', 'public'];
    const files = await scanMarkdownFiles(options.contentDir, options.locales);
    await validateRequiredFields(files, requiredFields, errors);
    await validateDuplicateIds(files, errors);
    await validateDuplicateSlugs(files, errors);
    await validateMenuPositions(files, errors);
    await validateComponents(files, options, errors);
    validateMissingLocales(files, options, warnings);
    const entries = files.map((file) => {
        const id = String(file.frontmatter.id || file.slug);
        const route = routeForLocaleSlug(file.locale, file.slug);
        return {
            id,
            locale: file.locale,
            slug: file.slug,
            path: route,
            file: file.file,
            component: file.frontmatter.component ? String(file.frontmatter.component) : undefined,
            public: file.frontmatter.public !== false &&
                String(file.frontmatter.public ?? 'true').toLowerCase() !== 'false',
            attributes: file.frontmatter,
            frontmatter: file.frontmatter,
            body: file.body,
            route,
            alternatives: {},
        };
    });
    const index = buildContentIndex(entries);
    if (index.routes.length === 0) {
        warnings.push(`No public routes were generated from ${options.contentDir}.`);
    }
    if (options.strictMissingLocales &&
        warnings.some((warning) => warning.startsWith('[missing-locale]'))) {
        errors.push(...warnings.filter((warning) => warning.startsWith('[missing-locale]')));
    }
    return { errors, warnings };
}
async function validateRequiredFields(files, requiredFields, errors) {
    for (const file of files) {
        for (const field of requiredFields) {
            const value = file.frontmatter[field];
            if (value === undefined || value === null || value === '') {
                errors.push(`[${file.locale}] ${file.file}: Missing required frontmatter field: ${field}`);
            }
        }
    }
}
async function validateDuplicateIds(files, errors) {
    const seen = new Map();
    for (const file of files) {
        const id = String(file.frontmatter.id || file.slug);
        const key = `${file.locale}:${id}`;
        const previous = seen.get(key);
        if (previous) {
            errors.push(`[${file.locale}] ${file.file}: Duplicate content id '${id}'. First occurrence: ${previous}`);
        }
        else {
            seen.set(key, file.file);
        }
    }
}
async function validateDuplicateSlugs(files, errors) {
    const seen = new Map();
    for (const file of files) {
        const key = `${file.locale}:${file.slug}`;
        const previous = seen.get(key);
        if (previous) {
            errors.push(`[${file.locale}] ${file.file}: Duplicate slug '${file.slug}'. First occurrence: ${previous}`);
        }
        else {
            seen.set(key, file.file);
        }
    }
}
async function validateMenuPositions(files, errors) {
    const seen = new Map();
    for (const file of files) {
        const menu = file.frontmatter.menu;
        const position = file.frontmatter.menu_position;
        if (menu === undefined || menu === '' || position === undefined || position === '')
            continue;
        const numeric = Number(position);
        if (Number.isNaN(numeric)) {
            errors.push(`[${file.locale}] ${file.file}: menu_position must be a number when menu is set.`);
            continue;
        }
        const key = `${file.locale}:${menu}:${numeric}`;
        const previous = seen.get(key);
        if (previous) {
            errors.push(`[${file.locale}] ${file.file}: Duplicate menu/menu_position '${menu}/${numeric}'. First occurrence: ${previous}`);
        }
        else {
            seen.set(key, file.file);
        }
    }
}
async function validateComponents(files, options, errors) {
    if (options.validateComponents === false)
        return;
    const available = await discoverComponents(options.componentsDir);
    for (const file of files) {
        const component = file.frontmatter.component ? String(file.frontmatter.component) : undefined;
        if (!component)
            continue;
        if (!available.has(component)) {
            errors.push(`[${file.locale}] ${file.file}: Component '${component}' does not exist in ${formatComponentsDir(options.componentsDir)}.`);
        }
    }
}
async function discoverComponents(componentsDir) {
    const dirs = Array.isArray(componentsDir)
        ? componentsDir
        : componentsDir
            ? [componentsDir]
            : ['src/components', 'src/pages'];
    const components = new Set();
    for (const dir of dirs) {
        const absolute = path.resolve(dir);
        let files;
        try {
            files = (await readdir(absolute, { withFileTypes: true }));
        }
        catch {
            continue;
        }
        for (const file of files) {
            if (!file.isFile())
                continue;
            if (!/\.(tsx?|jsx?)$/.test(file.name))
                continue;
            components.add(file.name.replace(/\.[^.]+$/, ''));
        }
    }
    return components;
}
function validateMissingLocales(files, options, warnings) {
    const idsByLocale = new Map();
    for (const file of files) {
        const id = String(file.frontmatter.id || file.slug);
        if (!idsByLocale.has(file.locale))
            idsByLocale.set(file.locale, new Set());
        idsByLocale.get(file.locale)?.add(id);
    }
    const allIds = new Set();
    for (const ids of idsByLocale.values()) {
        for (const id of ids)
            allIds.add(id);
    }
    for (const id of allIds) {
        for (const locale of options.locales) {
            if (!idsByLocale.get(locale)?.has(id)) {
                warnings.push(`[missing-locale] Content id '${id}' is missing locale '${locale}'.`);
            }
        }
    }
}
function formatComponentsDir(componentsDir) {
    if (!componentsDir)
        return 'src/components or src/pages';
    return Array.isArray(componentsDir) ? componentsDir.join(', ') : componentsDir;
}
