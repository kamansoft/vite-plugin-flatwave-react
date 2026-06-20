## MODIFIED Requirements

### Requirement: FlatwaveAppRoutes requires an explicit routes prop

`FlatwaveAppRoutes` SHALL accept a REQUIRED `routes: FlatwaveRoute[]` prop.
It SHALL NOT fall back to calling `getRoutes(lang)` from the virtual module when `routes` is absent.

This makes the component's data dependency visible in consumer code, traceable during debugging, and
replaceable with any route source (virtual module, CMS API, static config).

#### Scenario: Component renders only the provided routes

- **WHEN** `routes={threeRoutes}` is passed
- **THEN** `FlatwaveAppRoutes` renders exactly 3 `<Route>` elements for the provided routes

#### Scenario: TypeScript error when routes prop is absent

- **WHEN** a consumer renders `<FlatwaveAppRoutes renderPage={fn} />` without the `routes` prop
- **THEN** TypeScript emits a compile-time error (routes is required)

---

## REMOVED Requirements

### Requirement: FlatwaveAppRoutes accepts an optional routes prop with virtual module fallback

**Reason**: Falling back to `getRoutes(lang)` inside `FlatwaveAppRoutes` when `routes` is absent
hides a virtual module dependency inside the component. Making `routes` required keeps the component's
data dependency explicit and avoids an implicit import of `virtual:flatwave/content` inside the
package's own component code.

**Migration**:

```tsx
// Before (implicit fallback — no longer supported)
<FlatwaveAppRoutes renderPage={fn} />;

// After (explicit routes)
const { locale } = useFlatwaveLanguage();
const routes = useFlatwaveRoutes(locale);
<FlatwaveAppRoutes routes={routes} renderPage={fn} />;
```
