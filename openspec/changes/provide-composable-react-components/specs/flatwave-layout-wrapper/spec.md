## ADDED Requirements

### Requirement: FlatwaveLanguageRouter accepts a layoutWrapper prop

`FlatwaveLanguageRouter` SHALL accept an optional `layoutWrapper?: React.ComponentType<{ children: React.ReactNode; locale: string }>` prop. When provided, all rendered routes SHALL be wrapped inside this layout component, receiving the current locale as a prop. This mirrors the `PagesLayout` pattern in the working project.

#### Scenario: Layout wrapper wraps all page content

- **WHEN** `layoutWrapper={({ children, locale }) => <div lang={locale}><Header /><main>{children}</main><Footer /></div>}` is passed
- **THEN** all rendered pages are wrapped with the layout component, and `locale` is available as a prop

---

### Requirement: FlatwaveAppRoutes accepts a layoutWrapper prop

`FlatwaveAppRoutes` SHALL accept an optional `layoutWrapper?: React.ComponentType` prop. When provided, routes SHALL render inside the wrapper using react-router's `<Outlet />` pattern for nested routes. This enables consumers to create a shared layout structure.

#### Scenario: Layout wrapper works with Outlet pattern

- **WHEN** `layoutWrapper={MyLayout}` is provided to `FlatwaveAppRoutes`
- **THEN** MyLayout receives `<Outlet />` or equivalent to render child routes
