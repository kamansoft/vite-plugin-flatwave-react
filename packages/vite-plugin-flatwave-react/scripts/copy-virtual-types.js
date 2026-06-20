import { copyFileSync, mkdirSync, readFileSync, writeFileSync, cpSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(__dirname);

mkdirSync('dist/react', { recursive: true });
copyFileSync('src/virtual.d.ts', 'dist/react/virtual.d.ts');

// Copy templates directory
const templatesSrc = 'src/ssg/templates';
const templatesDest = 'dist/ssg/templates';
if (existsSync(templatesSrc)) {
  mkdirSync(templatesDest, { recursive: true });
  cpSync(templatesSrc, templatesDest, { recursive: true });
}

const declarationPath = 'dist/react/index.d.ts';
const reference = '/// <reference path="../virtual.d.ts" />\n';
let declaration = readFileSync(declarationPath, 'utf-8');

if (!declaration.startsWith(reference)) {
  declaration = reference + declaration;
}

writeFileSync(declarationPath, declaration);
