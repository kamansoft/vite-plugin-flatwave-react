# flatwave-md-component Specification

## Purpose

TBD - created by archiving change provide-composable-react-components. Update Purpose after archive.

## Requirements

### Requirement: Package exports FlatwaveMDComponent

The package SHALL export a React component named `FlatwaveMDComponent` from its public surface (`@kamansoft/vite-plugin-flatwave-react`). The component SHALL be a generic functional component typed as `FlatwaveMDComponent<TFrontmatter extends FlatwaveFrontmatter = FlatwaveFrontmatter>`.

#### Scenario: Named export is available

- **WHEN** a consumer imports `{ FlatwaveMDComponent }` from `@kamansoft/vite-plugin-flatwave-react`
- **THEN** the import resolves to a React functional component without runtime error

#### Scenario: TypeScript generic allows frontmatter extension

- **WHEN** a consumer defines `interface MyFrontmatter extends FlatwaveFrontmatter { audioUrl: string }` and uses `FlatwaveMDComponent<MyFrontmatter>`
- **THEN** TypeScript accepts `frontmatter.audioUrl` as a valid property access within a component that wraps `FlatwaveMDComponent<MyFrontmatter>`

---

### Requirement: Component accepts pre-compiled HTML via markdownHtml prop

`FlatwaveMDComponent` SHALL accept a `markdownHtml: string` prop. When this prop is provided, the component SHALL render its content using `dangerouslySetInnerHTML={{ __html: markdownHtml }}` inside a wrapper element. This mode is intended for SSG contexts where the markdown has already been compiled to HTML by the build pipeline.

#### Scenario: Pre-compiled HTML is rendered verbatim

- **WHEN** `markdownHtml="<p>Hello <strong>world</strong></p>"` is passed as a prop
- **THEN** the rendered DOM contains `<p>Hello <strong>world</strong></p>` as inner HTML

#### Scenario: markdownHtml takes priority over markdown when both are provided

- **WHEN** both `markdownHtml="<p>compiled</p>"` and `markdown="raw"` are passed
- **THEN** the component renders the compiled HTML and ignores the raw markdown string

---

### Requirement: Component accepts raw markdown via markdown prop

`FlatwaveMDComponent` SHALL accept a `markdown: string` prop. When this prop is provided and `markdownHtml` is not, the component SHALL render the markdown string using the `react-markdown` library (a peer dependency).

#### Scenario: Raw markdown is rendered client-side

- **WHEN** `markdown="# Hello\n\nThis is **markdown**."` is passed without `markdownHtml`
- **THEN** the rendered DOM contains an `<h1>` element with text "Hello" and a `<p>` with bold text

---

### Requirement: Component strips YAML frontmatter from markdown prop

`FlatwaveMDComponent` SHALL automatically strip a YAML frontmatter block (delimited by `---` at start and end) from the `markdown` prop before passing it to `react-markdown`. This is defensive: the virtual module already provides stripped content, but direct string use may include frontmatter.

#### Scenario: frontmatter block is stripped before rendering

- **WHEN** a markdown string starting with `---\ntitle: Test\n---\n\n# Body` is passed via the `markdown` prop
- **THEN** the rendered output does NOT contain the raw frontmatter lines (`---`, `title: Test`)

---

### Requirement: Component accepts typed frontmatter prop

`FlatwaveMDComponent` SHALL accept a `frontmatter: TFrontmatter` prop (where `TFrontmatter extends FlatwaveFrontmatter`). The frontmatter values SHALL be accessible to child components via the `children` render-prop pattern.

#### Scenario: Frontmatter fields are passed to children render prop

- **WHEN** `frontmatter={{ title: "About", slug: "about", ... }}` is passed and the `children` prop is `(rendered, fm) => <><h1>{fm.title}</h1>{rendered}</>`
- **THEN** the rendered output contains `<h1>About</h1>` above the markdown content

---

### Requirement: Component accepts locale prop

`FlatwaveMDComponent` SHALL accept a `locale: string` prop and expose it to consumers via the `FlatwaveLanguageContext` React context. The locale is not used to alter rendering logic within the component itself, but it is made available for descendant components via context.

#### Scenario: Locale is exposed in context

- **WHEN** `locale="es"` is passed and a child component reads `FlatwaveLanguageContext`
- **THEN** the context value's `locale` equals `"es"`

---

### Requirement: Component supports children render prop for layout customization

`FlatwaveMDComponent` SHALL accept an optional `children` prop typed as `(rendered: React.ReactNode, frontmatter: TFrontmatter) => React.ReactNode`. When provided, the component SHALL call `children` with the rendered markdown content and the frontmatter object, and render the result. When not provided, the component SHALL render the markdown content directly.

#### Scenario: Children render prop wraps the rendered content

- **WHEN** `children={(content, fm) => <article data-slug={fm.slug}>{content}</article>}` is passed
- **THEN** the output is wrapped in `<article data-slug="...">` and contains the rendered markdown

#### Scenario: No children prop renders content directly

- **WHEN** no `children` prop is provided
- **THEN** the component renders the markdown content without any additional wrapper

---

### Requirement: Component accepts className and style props

`FlatwaveMDComponent` SHALL accept `className?: string` and `style?: React.CSSProperties` props, which SHALL be applied to the outermost rendered element of the component. No default CSS classes SHALL be applied.

#### Scenario: className is applied to root element

- **WHEN** `className="prose"` is passed
- **THEN** the outermost rendered element has the class `prose`

---

### Requirement: Component is composable — consumers can create extended versions

The `FlatwaveMDComponentProps` interface and `FlatwaveMDComponent` SHALL be exported so that consumers can create wrapper components that add behaviour or new props without re-implementing the markdown rendering logic.

#### Scenario: Consumer creates an extended component

- **WHEN** a consumer writes `function MyPage(props: FlatwaveMDComponentProps & { header: string }) { return <><h1>{props.header}</h1><FlatwaveMDComponent {...props} /></> }`
- **THEN** TypeScript compiles without error and the component renders both the custom header and the markdown content
