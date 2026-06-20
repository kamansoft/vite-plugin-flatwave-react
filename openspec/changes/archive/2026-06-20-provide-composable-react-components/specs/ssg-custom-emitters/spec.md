## ADDED Requirements

### Requirement: RenderHooks interface includes an emitFiles callback

The `RenderHooks` interface in `packages/vite-plugin-flatwave-react/src/types.ts` SHALL include an optional `emitFiles` callback:

```ts
emitFiles?: (context: EmitFilesContext) => Promise<SsgOutputFile[]> | SsgOutputFile[];
```

Where `EmitFilesContext` is a new exported interface containing:

- `routes: FlatwaveRoute[]` — all public routes from the content index
- `contentIndex: FlatwaveContentIndex` — the complete content index including all locales and entries
- `renderedFiles: SsgOutputFile[]` — all HTML output files already rendered by the SSG loop

`SsgOutputFile` (already defined in `runSsg.ts`) SHALL be exported from the package's public surface for use in consumer `emitFiles` implementations.

#### Scenario: emitFiles is optional and build succeeds without it

- **WHEN** a consumer configures `flatwaveContent()` without providing `hooks.emitFiles`
- **THEN** the build completes without error and the standard output files are emitted

#### Scenario: TypeScript accepts the emitFiles signature

- **WHEN** a consumer writes `hooks: { emitFiles: ({ routes }) => [{ fileName: 'nav.json', source: '{}' }] }`
- **THEN** TypeScript compiles without error

---

### Requirement: RenderPipeline executes emitFiles hooks after the render loop

`RenderPipeline` SHALL add an `executeEmitFiles` method that calls all registered `emitFiles` hooks sequentially and merges their returned `SsgOutputFile[]` arrays. Errors in individual hooks SHALL be caught and logged, and the remaining hooks SHALL continue executing.

#### Scenario: executeEmitFiles returns combined output from all hooks

- **WHEN** two `emitFiles` hooks are registered, returning `[fileA]` and `[fileB]` respectively
- **THEN** `executeEmitFiles` returns `[fileA, fileB]`

#### Scenario: Hook error does not abort remaining hooks

- **WHEN** the first `emitFiles` hook throws an error and the second returns `[fileB]`
- **THEN** `executeEmitFiles` logs the error and still returns `[fileB]`

---

### Requirement: runSsg calls executeEmitFiles after the rendering loop

In `runSsg.ts`, after all routes have been rendered and before the standard outputs (route manifest, sitemap, robots.txt) are assembled, `runSsg` SHALL call `pipeline.executeEmitFiles` with the `EmitFilesContext` containing the full routes, content index, and the list of rendered HTML files. The returned `SsgOutputFile[]` SHALL be appended to the output file list and emitted as Vite bundle assets.

#### Scenario: emitFiles output files appear in the build output directory

- **WHEN** `hooks.emitFiles` returns `[{ fileName: 'navigation.json', source: '{"items":[]}' }]`
- **THEN** `navigation.json` is present in the build output directory after `vite build`

#### Scenario: emitFiles runs after all HTML route files are rendered

- **WHEN** `hooks.emitFiles` is called
- **THEN** the `renderedFiles` context field contains the rendered HTML for all public routes

---

### Requirement: emitFiles can generate a navigation manifest from route data

A consumer SHALL be able to use `emitFiles` to generate a `navigation.json` file where each entry contains the `url` (route path) and `publicName` (route title from frontmatter). This JSON file can then be used by a separately implemented React component to populate a navigation menu.

#### Scenario: Navigation JSON is generated with correct shape

- **WHEN** `hooks.emitFiles = ({ routes }) => [{ fileName: 'navigation.json', source: JSON.stringify(routes.map(r => ({ url: r.path, publicName: r.metadata.title }))) }]`
- **THEN** `navigation.json` contains an array of objects each with `url` and `publicName` string fields

#### Scenario: Navigation JSON entries correspond to public routes only

- **WHEN** the content directory contains both public (`public: true`) and private (`public: false`) entries
- **THEN** the `routes` received by `emitFiles` contain only public routes (matching the existing behaviour of `index.routes`)

---

### Requirement: SsgOutputFile is exported from the package public surface

`SsgOutputFile` (the `{ fileName: string; source: string }` interface) SHALL be exported from `@kamansoft/vite-plugin-flatwave-react` so that consumers can type their `emitFiles` return value without importing from internal package paths.

#### Scenario: Consumer can import SsgOutputFile for type annotation

- **WHEN** a consumer writes `import type { SsgOutputFile } from '@kamansoft/vite-plugin-flatwave-react'`
- **THEN** TypeScript resolves the type without error

---

### Requirement: emitFiles context is typed and exported

`EmitFilesContext` SHALL be exported from the package public surface so consumers can type their `emitFiles` callback parameter explicitly.

#### Scenario: Consumer can import EmitFilesContext for type annotation

- **WHEN** a consumer writes `import type { EmitFilesContext } from '@kamansoft/vite-plugin-flatwave-react'`
- **THEN** TypeScript resolves the type without error and the type contains `routes`, `contentIndex`, and `renderedFiles` fields
