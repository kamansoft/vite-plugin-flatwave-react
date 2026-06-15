import { readFileSync, writeFileSync } from 'node:fs';

const dryRun = process.argv.includes('--dry-run');
const packageJsonPath = new URL('../package.json', import.meta.url);
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const version = String(packageJson.version ?? '');
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

if (!match) {
  throw new Error(`Invalid package version "${version}". Expected MAJOR.MINOR.PATCH.`);
}

const nextVersion = `${Number(match[1])}.${Number(match[2])}.${Number(match[3]) + 1}`;
packageJson.version = nextVersion;
const nextPackageJson = `${JSON.stringify(packageJson, null, 2)}\n`;

console.log(nextVersion);

if (!dryRun) {
  writeFileSync(packageJsonPath, nextPackageJson);
}
