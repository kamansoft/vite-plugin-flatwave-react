# flatwave-language-selector Specification

## Purpose

TBD - created by archiving change provide-composable-react-components. Update Purpose after archive.

## Requirements

### Requirement: Package exports FlatwaveLanguageSelector

The package SHALL export a React component named `FlatwaveLanguageSelector` from its public surface. It SHALL render a language switching UI using `FlatwaveLanguageContext` to determine the available languages and the current locale.

#### Scenario: Selector renders all supported languages

- **WHEN** `FlatwaveLanguageContext.supportedLanguages` is `['es', 'pt']` and `FlatwaveLanguageContext.locale` is `'es'`
- **THEN** `FlatwaveLanguageSelector` renders options for both languages, with `'es'` marked as active

---

### Requirement: FlatwaveLanguageSelector accepts a renderOption render prop

`FlatwaveLanguageSelector` SHALL accept an optional `renderOption?: (lang: string, label: string, isActive: boolean) => React.ReactNode` prop. When provided, it SHALL call this function for each language to render the option. When not provided, it SHALL render a default `<select>` with `<option>` elements.

#### Scenario: Custom renderOption receives language, label, and active state

- **WHEN** `renderOption={(lang, label, active) => <button disabled={active}>{label}</button>}`
- **THEN** the button for the active language is disabled and others are clickable

---

### Requirement: FlatwaveLanguageSelector calls onSelect callback when a language is selected

`FlatwaveLanguageSelector` SHALL accept an optional `onSelect?: (lang: string) => void` prop. It SHALL call this callback when the user selects a different language. This callback is invoked BEFORE navigation, allowing consumers to perform analytics or additional side effects.

#### Scenario: onSelect callback fires on language change

- **WHEN** user selects a different language and `onSelect={(lang) => console.log(lang)}` is provided
- **THEN** the callback receives the new language code

---

### Requirement: FlatwaveLanguageSelector integrates with browser history navigation

When a user selects a new language, `FlatwaveLanguageSelector` SHALL navigate to the corresponding language-prefixed URL. For example, if the current path is `/es/about` and user selects `'pt'`, it SHALL navigate to `/pt/about` (replacing history to avoid back-button confusion).

#### Scenario: Navigation uses correct language prefix

- **WHEN** current path is `/es/about` and user selects `'pt'`
- **THEN** the router navigates to `/pt/about` with `replace: true`

#### Scenario: Default language selection does not redirect

- **WHEN** current language matches `defaultLanguage` and user re-selects it
- **THEN** no navigation occurs (same language selected)

---

### Requirement: FlatwaveLanguageSelector uses FlatwaveLanguageContext for language state

`FlatwaveLanguageSelector` SHALL read `locale`, `supportedLanguages`, and `defaultLanguage` from `FlatwaveLanguageContext`. It SHALL not accept these as separate props to avoid prop drilling.

#### Scenario: Selector uses context without additional props

- **WHEN** the component is placed inside a `FlatwaveLanguageDetector` tree
- **THEN** it has access to all language configuration without additional props

---

### Requirement: FlatwaveLanguageSelector supports custom className and style

`FlatwaveLanguageSelector` SHALL accept `className?: string` and `style?: React.CSSProperties` props that are applied to the root element of the rendered UI (the `<select>` or the container for custom-rendered options).

#### Scenario: className is applied to root element

- **WHEN** `className="lang-selector"` is passed
- **THEN** the outermost element has class `"lang-selector"`

---

### Requirement: FlatwaveLanguageSelector supports getLabel override for custom labels

`FlatwaveLanguageSelector` SHALL accept an optional `getLabel?: (lang: string) => string` prop that allows consumers to customize the display label for each language. If not provided, it SHALL use the language code itself as the label.

#### Scenario: Custom labels are used when getLabel is provided

- **WHEN** `getLabel={lang => lang === 'es' ? 'Español' : 'Português'}` is passed
- **THEN** the selector displays 'Español' and 'Português' instead of 'es' and 'pt'
