## ADDED Requirements

### Requirement: Package exports FlatwaveAppRoutes

The package SHALL export a React component named `FlatwaveAppRoutes` from its public surface. It SHALL map `FlatwaveRoute[]` to `react-router-dom` `<Routes>` by creating a `<Route path={route.path}>` for each public route. It SHALL accept a REQUIRED `renderPage: (route: FlatwaveRoute, lang: string) => React.ReactNode` prop to render the page content for each route.

#### Scenario: Route elements are created for each route

- **WHEN** `routes` contains 3 `FlatwaveRoute` objects and `renderPage` is provided
- **THEN** `FlatwaveAppRoutes` renders 3 `<Route>` elements internally (wrapped by a `<Routes>`)

#### Scenario: Dynamic route segments are handled correctly

- **WHEN** a route has `path="/es/about"` and `renderPage` is called with that route
- **WHEN** another route has `path="/es/:slug"` for dynamic slug pages
- **THEN** both routes are rendered in the `<Routes>` tree with correct path attributes

---

### Requirement: FlatwaveAppRoutes accepts an optional routes prop

`FlatwaveAppRoutes` SHALL accept an optional `routes: FlatwaveRoute[]` prop. When provided, it SHALL use those routes instead of calling `getRoutes(lang)` from the virtual module. This allows consumers who generate their own route data to supply it.

#### Scenario: Custom routes are used when provided

- **WHEN** a consumer passes `routes={customRoutes}` to `FlatwaveAppRoutes`
- **THEN** the component renders only the provided custom routes, not the virtual module routes

#### Scenario: Virtual module routes are used when routes prop is absent

- **WHEN** no `routes` prop is provided
- **THEN** `FlatwaveAppRoutes` calls `getRoutes(lang)` using the active locale from `FlatwaveLanguageContext`

---

### Requirement: FlatwaveAppRoutes accepts a renderPage render prop

The `renderPage` prop SHALL be called with `(route: FlatwaveRoute, lang: string)` and SHALL receive the full route metadata including frontmatter. This matches the working project's `DynamicSimplePageWrapper` pattern.

#### Scenario: renderPage receives full route metadata

- **WHEN** `renderPage` is called for a route with `frontmatter: { title: "About", ... }`
- **THEN** `renderPage` can use `route.frontmatter.title` or `route.metadata.title` to render the page

---

### Requirement: FlatwaveAppRoutes integrates with FlatwaveLanguageContext

`FlatwaveAppRoutes` SHALL read the current `locale` from `FlatwaveLanguageContext` to determine which language's routes to render when `routes` prop is not provided.

#### Scenario: App routes respect the active language context

- **WHEN** `FlatwaveLanguageContext.locale` is `"pt"` and `routes` prop is not provided
- **THEN** `FlatwaveAppRoutes` renders routes filtered by locale `"pt"`

---

### Requirement: FlatwaveAppRoutes renders a default 404 route

`FlatwaveAppRoutes` SHALL render a catch-all `<Route path="*">` that renders `null`. Consumers who want a 404 page SHALL include a route with a dynamic segment (e.g. `path="*"` in their routes list or create their own 404 route structure externally.

#### Scenario: Catch-all route renders null

- **WHEN** navigating to a non-existent path
- **THEN** the catch-all route renders null (no error thrown)
