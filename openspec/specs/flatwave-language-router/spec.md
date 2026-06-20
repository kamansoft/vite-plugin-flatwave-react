# flatwave-language-router Specification

## Purpose

TBD - created by archiving change provide-composable-react-components. Update Purpose after archive.

## Requirements

### Requirement: Package exports FlatwaveLanguageRouter

The package SHALL export a React component named `FlatwaveLanguageRouter` from its public surface. It SHALL provide a complete, ready-to-use multilingual routing solution that wraps `BrowserRouter` from `react-router-dom`, integrates `FlatwaveLanguageDetector` for automatic language detection and URL management, and renders user-defined routes via a `renderPage` render prop.

#### Scenario: Named export is available

- **WHEN** a consumer imports `{ FlatwaveLanguageRouter }` from `@kamansoft/vite-plugin-flatwave-react`
- **THEN** the import resolves to a React functional component without runtime error

---

### Requirement: FlatwaveLanguageRouter accepts supportedLanguages and defaultLanguage props

`FlatwaveLanguageRouter` SHALL accept:

- `supportedLanguages: string[]` — the list of locale codes supported by the site (e.g. `['es', 'pt']`)
- `defaultLanguage: string` — the locale to redirect to when no language prefix is present in the URL and browser preference is not in the supported list

Both props are REQUIRED.

#### Scenario: Router is configured with supported languages

- **WHEN** `supportedLanguages={['es', 'pt']} defaultLanguage="es"` are passed
- **THEN** the router treats `es` and `pt` as valid language URL prefixes

#### Scenario: TypeScript error when required props are missing

- **WHEN** a consumer renders `<FlatwaveLanguageRouter renderPage={fn} />` without `supportedLanguages` or `defaultLanguage`
- **THEN** TypeScript emits a compile-time error

---

### Requirement: FlatwaveLanguageRouter redirects root path to preferred language

When a user navigates to `/` (or any path without a recognised language prefix), `FlatwaveLanguageRouter` SHALL detect the browser's preferred language (via `navigator.language` / `navigator.languages`), match it against `supportedLanguages`, and redirect to `/{matchedLang}{currentPath}`. If no match is found, it SHALL redirect using `defaultLanguage`.

#### Scenario: Browser language matches a supported language

- **WHEN** browser language is `"pt"` and `supportedLanguages` includes `"pt"` and the current path is `/`
- **THEN** the router redirects to `/pt` (replace history, no browser back)

#### Scenario: Browser language does not match any supported language

- **WHEN** browser language is `"fr"` and `supportedLanguages` is `['es', 'pt']` with `defaultLanguage="es"`
- **THEN** the router redirects to `/es`

#### Scenario: URL already has a valid language prefix — no redirect

- **WHEN** the current path is `/es/about` and `es` is in `supportedLanguages`
- **THEN** no redirect occurs

---

### Requirement: FlatwaveLanguageRouter calls onLanguageChange when the active language changes

`FlatwaveLanguageRouter` SHALL accept an optional `onLanguageChange?: (lang: string) => void` prop. It SHALL call this callback with the new language code whenever the active language changes (either from a redirect or from direct navigation to a different language prefix).

#### Scenario: Callback is called on initial language detection

- **WHEN** the router resolves the language on first render (e.g. redirecting from `/` to `/es`)
- **THEN** `onLanguageChange("es")` is called once

#### Scenario: Callback is called on language switch navigation

- **WHEN** the user navigates from `/es/page` to `/pt/page`
- **THEN** `onLanguageChange("pt")` is called

#### Scenario: Callback is not called when language has not changed

- **WHEN** the user navigates from `/es/about` to `/es/contact`
- **THEN** `onLanguageChange` is NOT called (same language, different page)

---

### Requirement: FlatwaveLanguageRouter renders routes via a renderPage render prop

`FlatwaveLanguageRouter` SHALL accept a REQUIRED `renderPage: (route: FlatwaveRoute, lang: string) => React.ReactNode` prop. For each route returned by `getRoutes(lang)` from the virtual module (filtered by the active language), the router SHALL render a `<Route path={route.path}>` that calls `renderPage(route, lang)`.

The router SHALL additionally render:

- A catch-all `<Route path="*">` that returns `null` (consumers are responsible for adding a 404 component by including it in their renderPage logic or via an additional route).

#### Scenario: renderPage is called for each route of the active language

- **WHEN** the content index has 3 routes for locale `"es"` and the current language is `"es"`
- **THEN** `renderPage` is called for each of those 3 routes when navigating to their paths

#### Scenario: renderPage receives the full FlatwaveRoute object

- **WHEN** navigating to `/es/about`
- **THEN** `renderPage` receives a `FlatwaveRoute` object with `locale: "es"`, `path: "/es/about"`, and all frontmatter fields

---

### Requirement: FlatwaveLanguageRouter accepts a dynamicRoute prop for content-driven pages

`FlatwaveLanguageRouter` SHALL accept an optional `dynamicRoute?: DynamicRouteConfig` prop to handle content-driven pages where the path is not known at build time (e.g., `/{lang}/:slug` for markdown pages). `DynamicRouteConfig` contains:

```ts
interface DynamicRouteConfig {
  path: string; // Route path pattern, e.g., "/:slug"
  renderPage: (params: { slug: string; lang: string }) => React.ReactNode; // Render function receiving slug param
}
```

#### Scenario: Dynamic route renders content for matching slug

- **WHEN** current path is `/es/some-page` and `dynamicRoute={{ path: "/:slug", renderPage: ({ slug }) => <FlatwaveMDPageComponent content={getContent(slug)} /> }}`
- **THEN** the dynamic route renders the page for `some-page`

#### Scenario: Dynamic route takes precedence over static routes for slug paths

- **WHEN** a static route `/es/about` exists and `dynamicRoute` is configured for `/:slug`
- **THEN** navigating to `/es/about` renders the static route, but `/es/any-slug` renders via the dynamic route

---

### Requirement: Package exports FlatwaveLanguageDetector as a standalone component

The package SHALL export `FlatwaveLanguageDetector` separately from `FlatwaveLanguageRouter`. This component SHALL implement only the language detection and URL-prefix management logic (no `BrowserRouter`, no route rendering). It SHALL accept `supportedLanguages`, `defaultLanguage`, `onLanguageChange`, and `children: React.ReactNode` props. This allows consumers who already have a `BrowserRouter` to add language detection to their existing router setup.

#### Scenario: FlatwaveLanguageDetector works inside an existing BrowserRouter

- **WHEN** a consumer renders `<BrowserRouter><FlatwaveLanguageDetector ...><AppRoutes /></FlatwaveLanguageDetector></BrowserRouter>`
- **THEN** language detection and redirection work correctly without wrapping in another BrowserRouter

#### Scenario: FlatwaveLanguageDetector renders children after language is resolved

- **WHEN** the language is successfully resolved (initial render)
- **THEN** children are rendered (no indefinite loading state)

---

### Requirement: Package exports FlatwaveLanguageContext

The package SHALL export a `FlatwaveLanguageContext` React context of type `{ locale: string; supportedLanguages: string[]; defaultLanguage: string }`. `FlatwaveLanguageDetector` SHALL provide this context to all descendant components with the current active language values.

#### Scenario: Context is accessible to descendant components

- **WHEN** a component inside the router tree calls `useContext(FlatwaveLanguageContext)`
- **THEN** it receives the current `locale`, `supportedLanguages`, and `defaultLanguage` values

#### Scenario: Context locale updates when language changes

- **WHEN** the user navigates from `/es/page` to `/pt/page`
- **THEN** `FlatwaveLanguageContext.locale` updates to `"pt"` in all consumers of the context

---

### Requirement: FlatwaveLanguageRouter does not import or require any i18n library

`FlatwaveLanguageRouter` and `FlatwaveLanguageDetector` SHALL NOT import `i18next`, `react-i18next`, `react-intl`, `lingui`, or any other i18n library. Language sync with third-party i18n libraries is the consumer's responsibility, achieved via the `onLanguageChange` callback.

#### Scenario: Plugin package has no i18n library dependency

- **WHEN** inspecting `packages/vite-plugin-flatwave-react/package.json` dependencies and peerDependencies
- **THEN** no i18n library is listed as a dependency or peerDependency

#### Scenario: Consumer wires i18next via onLanguageChange

- **WHEN** a consumer passes `onLanguageChange={(lang) => i18n.changeLanguage(lang)}` to `FlatwaveLanguageRouter`
- **THEN** `i18n.changeLanguage` is called whenever the route language changes
