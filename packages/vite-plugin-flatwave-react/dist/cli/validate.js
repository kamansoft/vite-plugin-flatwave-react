#!/usr/bin/env node
import { Command } from 'commander';
import { validateContent } from '../content/validator.js';
const program = new Command();
program
    .name('flatwave-validate')
    .description('Validate Flatwave Markdown content using the same rules as the Vite plugin.')
    .requiredOption('--content-dir <dir>', 'Markdown content directory, e.g. src/content')
    .requiredOption('--locales <locales>', 'Comma-separated locales, e.g. es,pt')
    .requiredOption('--default-locale <locale>', 'Default locale, e.g. es')
    .option('--strict-missing', 'Fail when locale variants are missing', false)
    .option('--no-validate-components', 'Disable component existence validation')
    .action(async (options) => {
    const locales = options.locales
        .split(',')
        .map((locale) => locale.trim())
        .filter(Boolean);
    const result = await validateContent({
        contentDir: options.contentDir,
        locales,
        defaultLocale: options.defaultLocale,
        strictMissingLocales: options.strictMissing,
        validateComponents: options.validateComponents,
    });
    for (const warning of result.warnings) {
        console.warn(`[WARN] ${warning}`);
    }
    if (result.errors.length > 0) {
        console.error('[ERROR] Flatwave validation failed:');
        for (const error of result.errors) {
            console.error(`  - ${error}`);
        }
        process.exitCode = 1;
        return;
    }
    console.log(`Flatwave validation passed for ${locales.join(', ')} with ${result.warnings.length} warning(s).`);
});
program.parseAsync(process.argv).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
