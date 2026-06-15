import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

mkdirSync('dist/react', { recursive: true });
copyFileSync('src/virtual.d.ts', 'dist/react/virtual.d.ts');

const declarationPath = 'dist/react/index.d.ts';
const reference = '/// <reference path="../virtual.d.ts" />\n';
let declaration = readFileSync(declarationPath, 'utf-8');

if (!declaration.startsWith(reference)) {
  declaration = reference + declaration;
}

writeFileSync(declarationPath, declaration);
