## MODIFIED Requirements

### Requirement: FlatwaveLanguageRouter requires explicit routes prop

`FlatwaveLanguageRouter` SHALL accept a REQUIRED `renderPage: (route: FlatwaveRoute, lang: string) => React.ReactNode`
prop. It SHALL also accept a REQUIRED `routes: FlatwaveRoute[]` prop.

The router SHALL NOT silently call `getRoutes(lang)` from the virtual module as an implicit internal
side-effect. The data source must be explicit in consumer code.

#### Scenario: Routes prop is required to render route elements

- **WHEN** a consumer provides `routes={esRoutes}` with 3 routes
- **THEN** `renderPage` is called for each of those 3 routes when navigating to their paths

#### Scenario: Consumer supplies routes from the virtual module explicitly

- **WHEN** `routes={useFlatwaveRoutes(locale)}` is passed
- **THEN** the router renders exactly the virtual module routes for that locale, and the consumer's
  code makes the data source visible and traceable

#### Scenario: Consumer supplies routes from a custom source

- **WHEN** `routes={customApiRoutes}` is passed where routes came from an external API or static config
- **THEN** the router renders those custom routes without error or conflict with the virtual module

#### Scenario: TypeScript error when routes prop is absent

- **WHEN** a consumer renders `<FlatwaveLanguageRouter renderPage={fn} />` without the `routes` prop
- **THEN** TypeScript emits a compile-time error (routes is required)

---

## REMOVED Requirements

### Requirement: FlatwaveLanguageRouter renders routes from the virtual module implicitly

**Reason**: Silently calling `getRoutes(lang)` inside the component creates a hidden coupling between
the router and the virtual module that is invisible in the consumer's code, makes testing harder, and
blocks consumers who want custom route sources.

**Migration**: Pass `routes` explicitly. For the common case (virtual module routes):

```tsx
const { locale } = useFlatwaveLanguage();
const routes = useFlatwaveRoutes(locale);
// pass routes={routes} to FlatwaveLanguageRouter
```
