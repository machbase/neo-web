# Design System Tokens

SCSS design tokens extracted from ExtensionTab components.

## Quick Start

### Using Tokens
```scss
@use '@/design-system/tokens' as t;

.my-component {
  background-color: t.$bg-primary;
  color: t.$text-primary;
  padding: t.$spacing-8 t.$spacing-16;
}
```

### Using Mixins (Recommended!)
```scss
@use '@/design-system/tokens' as t;

.my-button {
  @include t.button-base;
  @include t.button-primary;
}
```

---

## Usage Examples

### Button Component

**Using Tokens:**
```scss
.example-button {
  background-color: t.$button-primary-bg;
  color: t.$text-primary;
  padding: t.$spacing-8 t.$spacing-16;
  font-size: t.$font-size-base;
  border-radius: t.$border-radius-sm;
  transition: t.$transition-default;

  &:hover {
    background-color: t.$accent-hover;
  }
}
```

**Using Mixins (Better!):**
```scss
.example-button {
  @include t.button-base;
  @include t.button-primary;

  &.delete {
    @include t.button-danger;
  }
}

.example-icon-button {
  @include t.button-icon;
}
```

### Card Component

**Using Mixins:**
```scss
.example-card {
  @include t.card;

  .title {
    @include t.text-ellipsis;
    font-size: t.$font-size-lg;
  }
}

.example-content-block {
  @include t.content-block;
}
```

### Input Component

**Using Mixins:**
```scss
.example-input {
  @include t.input-base;
  width: 100%;
}

.example-input-container {
  @include t.input-container;
  width: 200px;
}
```

### Table Component

**Using Mixins:**
```scss
.example-table {
  @include t.scrollbar;
  width: 100%;
  overflow-x: auto;

  thead {
    @include t.table-header;
  }

  tbody {
    @include t.table-body;
  }
}
```

### Layout Components

**Using Mixins:**
```scss
.example-flex-center {
  @include t.flex-center;
  height: 100px;
}

.example-flex-column {
  @include t.flex-column;
  gap: t.$spacing-12;
}
```

### Interactive States

**Using Mixins:**
```scss
.example-hover-item {
  @include t.hover-bg;
  padding: t.$spacing-12;
}

.example-clickable {
  @include t.hover-primary;
}

.example-focusable {
  @include t.focus-ring;
}
```

### Utilities

**Using Mixins:**
```scss
.example-divider {
  @include t.divider;
}

.example-text-truncate {
  @include t.text-ellipsis;
}

.example-multiline-truncate {
  @include t.text-ellipsis-multiline(3);
}
```

---

## Token Categories

### Colors

Every colour token, its dark value and what it falls back to: *Variables* below (and theme-tokens.json,
with each one's kind and part). What a token is for: *Colour architecture* and `tokenKinds.ts`.

### Spacing

#### Base Units

-   `$spacing-0` - 0
-   `$spacing-4` - 4px
-   `$spacing-8` - 8px
-   `$spacing-12` - 12px
-   `$spacing-16` - 16px
-   `$spacing-20` - 20px
-   `$spacing-24` - 24px
-   `$spacing-32` - 32px
-   `$spacing-40` - 40px

#### Component Specific

-   `$button-padding-x` - 16px
-   `$button-padding-y` - 8px
-   `$input-padding-x` - 8px
-   `$input-padding-y` - 4px
-   `$content-block-padding-x` - 16px
-   `$content-block-padding-y` - 12px

### Typography

#### Font Size

-   `$font-size-xs` - 10px
-   `$font-size-sm` - 12px (Badge)
-   `$font-size-base` - 13px (Default text)
-   `$font-size-md` - 14px (Table header)
-   `$font-size-lg` - 17px (Content title)
-   `$font-size-xl` - 30px (Sub title)

#### Font Weight

-   `$font-weight-normal` - 400
-   `$font-weight-medium` - 500
-   `$font-weight-semibold` - 600
-   `$font-weight-bold` - 700

#### Font Family

-   `$font-family-default` - inherit
-   `$font-family-pretendard` - 'Pretendard'

### Border Radius

-   `$border-radius-xs` - 2px (TextButton)
-   `$border-radius-sm` - 3px (Input, Checkbox)
-   `$border-radius-base` - 4px (IconButton)
-   `$border-radius-md` - 8px (Message)
-   `$border-radius-lg` - 10px
-   `$border-radius-circle` - 50% (Status circle)

### Shadows

-   `$shadow-none` - none
-   `$shadow-sm` - 0 1px 2px rgba(0, 0, 0, 0.12)
-   `$shadow-md` - 0 2px 4px rgba(0, 0, 0, 0.12)
-   `$shadow-lg` - 0 4px 8px rgba(0, 0, 0, 0.12)

### Transitions

-   `$transition-default` - all 0.2s ease
-   `$transition-duration-fast` - 0.2s
-   `$transition-duration-normal` - 0.3s

### Sizes

-   `$input-height` - 27px
-   `$button-height` - 25px
-   `$header-height` - 40px
-   `$icon-button-size` - 40px
-   `$checkbox-size` - 16px

---

## Available Mixins Reference

All mixins are extracted from ExtensionTab UI patterns for real-world usage.

### Layout Mixins

#### `flex-center`
Centers content using flexbox. Common pattern for buttons and centered containers.

#### `flex-column`
Vertical flexbox layout.

#### `flex-row($gap: 8px)`
Horizontal flexbox layout with optional gap parameter.

#### `full-size`
Sets width and height to 100%.

---

### Interactive State Mixins

#### `hover-bg($bg-color: $hover-bg)`
Adds hover background color transition. Used in table rows and list items.

#### `hover-primary`
Hover effect with primary color background. Includes cursor pointer.

#### `active-state`
Styling for active/selected states in tables and lists.

#### `focus-ring($color: $border-focus)`
Accessibility-friendly focus indicator with outline.

#### `focus-within($border-color: $border-focus)`
Border color change when child elements are focused. Used in input containers.

#### `disabled-state`
Standard disabled styling with reduced opacity and no pointer events.

---

### Button Mixins

#### `button-base`
Foundation for all buttons. Includes flexbox centering, padding, font styling, border, and transition.

#### `button-text`
Small text button style from ExtensionTab. Height-constrained with ellipsis overflow.

#### `button-icon`
Square icon button with fixed dimensions (40x40px). Centers icon content.

#### `button-primary`
Primary button variant with create button color. Includes hover state.

#### `button-danger`
Danger/delete button variant with red color scheme.

---

### Input Mixins

#### `input-base`
Base input field styling. Includes background, border, padding, focus ring, and placeholder color.

#### `input-container`
Wrapper container for inputs with border. Handles focus-within state.

---

### Card/Container Mixins

#### `content-block`
Content section padding with hover background effect. Used in ExtensionTab.

#### `card`
Card component with border, border radius, padding, and shadow.

---

### Table Mixins

#### `table-header`
Table header styling with semibold font and elevated background color.

#### `table-body`
Table body styling with hover effects on rows and active state support.

---

### Scrollbar Mixins

#### `scrollbar`
Custom webkit scrollbar styling matching ExtensionTab design. Includes track and thumb styling.

---

### Text Mixins

#### `text-ellipsis`
Single-line text truncation with ellipsis.

#### `text-ellipsis-multiline($lines: 2)`
Multi-line text truncation with customizable line count.

#### `text-wrap`
Text wrapping with word break support. Uses pre-wrap and break-word.

---

### Utility Mixins

#### `divider`
Horizontal divider line (1px height, full width).

#### `hr`
HR line styling from ExtensionTab.

#### `visually-hidden`
Hides element visually while keeping it accessible to screen readers.

#### `reset-appearance`
Removes default browser styling from form elements.

#### `absolute-cover`
Absolute positioning covering entire parent (top: 0, left: 0, right: 0, bottom: 0).

---

### Animation Mixins

#### `transition($property: all, $duration: 0.2s)`
Smooth transition with customizable property and duration.

#### `fade-in($duration: 0.3s)`
Fade-in animation with opacity transition.

#### `slide-in($direction: up, $duration: 0.3s)`
Slide-in animation. Supports 'up' direction (more directions can be added).

---

## File Structure

```
src/design-system/tokens/
├── _colors.scss           # Color tokens
├── _spacing.scss          # Spacing tokens
├── _typography.scss       # Typography tokens
├── _border-radius.scss    # Border radius tokens
├── _shadows.scss          # Shadow tokens
├── _z-index.scss          # Z-index tokens
├── _transitions.scss      # Transition tokens
├── _sizes.scss            # Size tokens
├── _borders.scss          # Border tokens
├── _mixins.scss           # Reusable style mixins
├── _index.scss            # Export all tokens and mixins
└── README.md              # Documentation
```

---

## Migration Guide

### Before (Hardcoded)

```scss
.extension-tab-wrapper {
    background-color: #1c1c21;
    color: #f1f1f1;
    padding: 8px 16px;
}
```

### After (Using Tokens)

```scss
@use '@/design-system/tokens' as t;

.extension-tab-wrapper {
    background-color: t.$bg-primary;
    color: t.$text-primary;
    padding: t.$spacing-8 t.$spacing-16;
}
```

---

## Themes

The web UI's colours are design tokens (`src/design-system/tokens`), and every colour token is a
CSS variable: `$bg-primary` compiles to `var(--neo-bg-primary, #1e1e1e)`. With no theme loaded
none of the variables is set, so each falls back to its dark default and the screen is the
built-in dark theme. A theme sets the variables it changes.

Themes are an experiment: they apply only while the server's experiment mode is on (`themesEnabled`,
the flag sign-in and the login check give). Off, every page — the sign-in page included — is the
dark default, Settings has no Theme item, and an app's theme requests are refused with the reason;
the choice and the browser's themes are kept for when it is on again.

### A theme package

A theme is an ordinary package installed from the App Store (`/public/<package>/`). Its
`package.json` declares it:

```json
{
    "name": "neo-pkg-theme-light",
    "version": "1.0.0",
    "neoTheme": { "label": "Light", "stylesheet": "theme.css", "scheme": "light" }
}
```

- `stylesheet` — a `.css` file inside the package (relative, no `..`).
- `scheme` — `light` or `dark`: the code editor's base colours and the page's `color-scheme`.
- `label` — what Settings → Theme shows (defaults to the package name).
- `loginImage` (optional) — the sign-in page's picture: a `.webp`, `.png`, `.jpg` or `.svg` inside the
  package, relative like `stylesheet`. The sign-in page shows the picture of the theme the browser
  last chose, from the package's versioned address, and the built-in one when it does not load. An
  index entry can name one too. A theme kept in the browser keeps its picture in its own entry
  (below). A theme's picture fills the page (`object-fit: cover`); the built-in one keeps its look.

The stylesheet sets variables on `:root`:

```css
:root {
    --neo-bg-primary: #ffffff;
    --neo-text-primary: #1f1f1f;
}
```

A variable it leaves out keeps the dark default, so a theme can change one colour or all of them.

### A package of several themes

A package can list its themes in JSON files instead of naming one stylesheet (the theme builder
package, `neo-pkg-theme-builder`, keeps its presets in one list and the themes it saves in
another):

```json
"neoTheme": { "label": "Theme Builder", "index": ["themes.json", "user/themes.json"] }
```

Each list is an array of `{ "id", "label", "stylesheet", "scheme" }` entries, optionally with
`note` (a short word shown beside it, e.g. `Preset`) and `swatch` (up to eight colours drawn in
its row). A list that is missing (nothing saved yet) is skipped. Settings → Theme shows such a
package's themes under its label and, when the package has an app (`main.html`), an
**Open <label>** button. A theme is told apart by package and stylesheet (`themeKey`), so two
themes of one package are two choices.

### Themes kept in the browser

The theme builder saves themes in the browser, not on the server: `localStorage['neo.themes']`
holds `[{ id, label, scheme, css, swatch, note, loginImage? }]`, and such a theme is chosen as
`{ pkg: '@local', stylesheet: '<id>.css' }`. They are the browser's, not an account's: whoever signs
in on this browser sees and chooses the same themes, and saving needs no write permission. Only the
`--neo-*` declarations of the kept text are applied (`localThemeCss`).

The sign-in page's picture the builder sets is not in the entry: it is the file itself (a Blob),
kept in IndexedDB (`neo-theme` → `pictures`, key `<id>`, `themePicture.ts`), and the entry only says
it has one (`loginImage: true`) — so the list read before the first paint stays small, and the
picture does not share localStorage's 5 MB. A WebP, PNG, JPEG, GIF or AVIF of at most 10 MB
(`LOGIN_PICTURE_MAX_BYTES`) is kept; anything else (an SVG, text) is refused with a reason, and a
stored one is checked again when read. The sign-in page reads the entry of the theme in use and then
its picture, showing none until it is in. Deleting the theme deletes its picture.

The choice is the browser's too (`neo.theme`, Dark included): the sign-in page and the pages after
it show the same theme. Settings → Theme lists the browser themes under **My themes**.

### Corners

Every corner radius is `calc(<size> * var(--neo-radius-scale, 1))`: the `$border-radius-*` tokens
(`_border-radius.scss`) and the radii written in place alike. With no theme the scale is 1 and
every corner is the size written; a theme sets `--neo-radius-scale` (0 square, 2 twice as round).
Circles (`50%`, a dot whose radius is half its size) and pills (20px and over) do not scale. A
new corner that is not a token: `border-radius: t.rounded(6px)`.

### Effects

A theme can switch on an effect built into the web UI — it names it, it brings no code:
`--neo-fx-cursor: sandevistan` (Cyberpunk's preset) leaves neon after-images behind the pointer
(`theme/cursorFx.ts`): 32 small layers over the page that take no pointer events, each holding a
glowing arrow drawn once; a move places one and the browser fades it, so nothing is drawn per
frame. Never on for a user who asked for reduced motion. `none` (the default) or any
other name is no effect. Listed in theme-tokens.json (`_effects.scss`).

### The theme variables, published

The build publishes every theme variable with its dark default as `/web/ui/theme-tokens.json`
(`[{ "name": "bg-primary", "dark": "#1e1e1e" }, …]`), read from `_colors.scss` and
`_shadows.scss` by `theme/themeTokens.ts` (vite.config.ts). A theme builder edits that list, so
it always matches the web UI it runs on.

### Requests from a package's app

An app tab (a same-origin iframe) can ask the page to show or choose a theme:

```js
parent.postMessage({ type: 'neo-theme', action: 'preview', vars: { 'bg-primary': '#fff' }, scheme: 'light' }, location.origin);
parent.postMessage({ type: 'neo-theme', action: 'preview', vars: null }, location.origin); // stop
parent.postMessage({ type: 'neo-theme', action: 'apply', choice: { pkg, stylesheet, label, scheme }, reload: true }, location.origin);
```

A preview sets the variables on top of the chosen theme until it is cleared or a theme is chosen;
nothing is remembered. `apply` chooses a theme as the dialog does (`choice: null` is Dark);
`reload` links the stylesheet again past every cache, for a stylesheet that was just rewritten.
Only messages from a frame of the page on its own origin are taken, and the choice is validated
like a manifest entry.

### Choosing a theme

Settings → Theme lists the built-in Dark, the browser's own themes and every installed
theme. The choice is kept per browser (localStorage `neo.theme`, with the stylesheet path) and
applied before the first render,
so a reload paints in the theme from its first frame. A theme whose package was uninstalled (or
that was deleted from its package's list) falls back to Dark; the Theme dialog then forgets it.

### Parts of the screen

Some parts have colours of their own (`_colors.scss`, *Areas*): the GNB (`gnb-*`), the tab bar
(`tabbar-*`), the side panel (`side-*`), the console (`console-*`; its selected task's lines, `console-selected-bg`, are a selection and fall back to `selected-bg`), tables (`table-*`, the row under
the pointer included: `table-row-hover-bg`), input fields (`field-*`) and dialogs (`dialog-*`); menus
(`menu-*`) and tooltips (`tooltip-*`) had theirs already. A theme that sets a part's tokens changes that part alone — the theme builder colours the
screen part by part this way, so its Frame no longer moves the side panel.

A dashboard has no colours of its own: it is a Page, in Content. A panel is not the theme's: each is
drawn in the chart theme it is set to (`ChartThemeBackgroundColor`; a dark one is a dark island), and
so are its series (`ChartSeriesColorList`, a tag's own colour).

- Each falls back to a shared token (`$side-bg: themed(side-bg, $bg-panel)`): a theme that leaves the
  part unset shows that token. theme-tokens.json says which (`fallback`).
- A call site writes the part's token as it is defined — `t.$table-header-bg`, or that written out,
  `var(--neo-table-header-bg, var(--neo-bg-elevated, #2c2c2c))` — never a fallback of its own (see
  *Colour architecture*).
- Components inside a part take its colours through hooks the part sets for its subtree: the icon
  button's `--ghost-icon` / `--ghost-icon-hover` / `--ghost-hover-bg` (GNB, side panel, console), the
  Page wrapper's `--page-bg` (the console's log body), a field's label and helper text `--label-text`
  (a dialog: its body text). The dark island resets the part tokens and the hooks.

### Dialogs

Every dialog, popover and modal is drawn the same way, whoever built it (the shared `Modal`, the old
`.modal`, the data viewer's, Tag Analyzer's popovers, the New tab's): the box `dialog-bg` and its title
`dialog-title-text`; every other word in it is the page's text — `text-primary` for its body, labels,
choices and values, `text-muted` for a note or a placeholder, `text-disabled`, `accent-text` — as
anywhere (a dialog sits on a layer of the page's brightness, so the shared text reads on it); an input,
a select or a list box in it is a field (`field-bg`, `field-border`, `field-icon`, `field-disabled-bg`); a grouped box inside
(a row of settings, a warning strip) `bg-panel`; a column header row `table-header-*`; a chart drawn in
it the dialog's colour. Not the frame's colour, a hover's or a menu's, which several of them borrowed.
Every site writes the tokens as they are defined (see *Colour architecture*), so a dialog is one colour with no theme too.

### Under the pointer (hover)

A hover is one kind, wherever it is: what the pointer is over takes its part's "under the pointer"
token — a GNB icon `gnb-hover-bg`, a tab `tabbar-hover-bg`, a side panel row or icon button (the
explorers, the DB explorer, the packages) `side-hover-bg`, a console button `console-hover-bg`, a table
row `table-row-hover-bg`, a menu item or an open list's option `menu-item-hover-bg`. On the content — an icon button, a card, a header row — it is the shared
hover, `hover-bg` (a list's or a tree's row takes `list-hover-bg`, a button or an icon in a toolbar `toolbar-hover-bg`: named for where they are, as VS Code's are). A
filled button's hover is a shade of its own fill (`accent-hover`, `btn-*`), not a hover token. Not a
fill colour that happens to be lighter (`bg-secondary`, `neutral-main`, `console-bg` were all used as
hovers): those move with what they are, not with the hover. Each part token falls back to the hover
the site drew before, so the dark screen and older themes are unchanged; the theme builder works them
all out from one *Hover*, each as the same step over its part's own background.
- Where each token is drawn is measured (`impactmap.mjs` in the regress measurer, the theme
  builder's `impact.json`); `areaTokens.test.ts` keeps the fallbacks and the island resets whole.

### Colour architecture

Every colour in the app's styles follows one set of rules, and `styleRules.test.ts` checks every
`.scss`, `.css` and `style={{ }}` against them; `tokenKinds.ts` holds them.

**Every token has one kind** (`TOKEN_KINDS`):

| kind | what it paints | tokens (examples) |
|---|---|---|
| surface | a background area | `bg-primary` (frame), `bg-secondary` (content), `bg-panel`, `bg-elevated` (raised: cards, chips, neutral buttons), `bg-canvas`, a part's `*-bg`, `dialog-bg`, `menu-bg` |
| field | a field's fill | `field-bg`, `field-disabled-bg` |
| hover | what the pointer is over | `hover-bg`, `list-hover-bg`, `toolbar-hover-bg`, a part's `*-hover-bg`, `menu-item-hover-bg` |
| selection | a selected item | `selected-bg`, `selected-hover-bg` (selected, under the pointer), `side-selected-bg`, `console-selected-bg` |
| glyph | text and icons | `text-*`, a part's `*-text`, `*-icon` |
| line | borders, dividers, tracks | `border-color-default`/`-strong`, `field-border`, `dialog-border`, `menu-border` |
| focus | the focus ring, an active line | `border-color-focus`, `border-color-active` |
| accent | the accent | `primary-*`, a part's `*-marker` |
| fill | a filled control | `button-primary-bg` (Primary button), `button-danger-bg`, `switch-thumb*` (a control switched on is `button-primary-bg`) |
| signal | a colour that says something | `success-main`/`-text`, `warning-main`/`-text`, `error-main`/`-text` (the fill / as text and status dots), `info-main`, `status-none` |
| overlay | the backdrop and shadows | `bg-backdrop`, `shadow-*` |
| content | a colour that names a thing | the file-type icons `icon-*` |

**Every interactive thing has the same states** (`ALLOWED`):

| thing | rest | under the pointer | selected (active) | selected, under the pointer | focus | disabled |
|---|---|---|---|---|---|---|
| a row or an item (a file, a table row, a list or menu item) | its part's surface | its part's hover | its part's selection | stays selected | the focus ring | muted text |
| a tab | its bar | the bar's hover | the open page's surface and the marker | stays | the ring | muted text |
| an icon button | transparent | its part's hover | (a toggle on) an accent tint | stays | the ring | faded |
| a filled button | its fill (`button-primary-bg`, `button-danger-bg`) | a step of it (`accent-hover`) | — | — | the ring | `button-disabled-bg` |
| a checkbox, a switch | a field | its part's hover | `button-primary-bg`, the tick `text-on-accent` | stays | the ring | `field-disabled-bg` |
| a chip, a segment | `bg-elevated` | hover | an accent tint and an accent line | stays | the ring | faded |
| a field | `field-bg`, `field-border` | a stronger line | — | — | `border-color-focus` | `field-disabled-bg` |
| a picked day or time | — | hover | `selected-bg`, its text `selected-text` | `selected-hover-bg` | the ring | — |

A background at rest is never a hover or a selection; under the pointer it is a hover (a filled
control: a step of its own fill); a selected thing is a selection. Keyboard focus on a list item and
a press look like the hover. In a menu a chosen option shows a check and hovers like the others. A list
where several rows can be picked (a checklist) shows it with the checkbox; the rows only tint.

**A part with its own state tokens takes them** (`PART_STATE_TOKENS`): a hover in the side panel is
`side-hover-bg` (its icon buttons get it through `--ghost-hover-bg`), a selected row there
`side-selected-bg`; the console, the GNB, the tab bar and tables the same. A dialog or popover is its
own place (see *Dialogs*), and a menu is a menu wherever it opens.

**One thing, one colour.** A thing that has its part's tokens takes them wherever it is drawn, by
whichever component — so a theme that gives inputs a colour gives it to every input, not to the half
drawn by the shared `Input`:

| thing | its tokens | drawn by |
|---|---|---|
| a field (an input, a select's closed box, a textarea, a search box) | `field-bg`, `field-border`, `field-icon` (search, clear, a select's chevron); what is typed, `text-primary` | `Input`, `Textarea`, `Dropdown`'s trigger, `Combobox`, `HierarchicalCombobox`, `InputSelect`, `DatePicker`, `BadgeSelect`, the `input-base` and `interactive-field-base` mixins, and every page's own inputs |
| a menu (an open list, a context menu) | `menu-bg`, `menu-border`, `menu-item-hover-bg`, `menu-item-icon`, `menu-shadow`; the items' words, `text-primary` | `Menu`, `List`, the open lists of `Dropdown`, `Combobox`, `InputSelect`, `TimePicker`, `BadgeSelect`, and every page's own menus |
| a dialog | `dialog-bg`, `dialog-title-text` (its title); the rest it says is the page's text | see *Dialogs* |
| a table | `table-header-bg`, `table-header-text` (column names), `table-row-number-text` (the numbers at the start of each row; the column names' colour unless a theme sets it), `table-stripe-bg`, `table-row-hover-bg`, `table-row-selected-bg` (the selected row) | `Table`, `Page`'s tables, the `table-header` / `table-body` / `server-html-table` mixins, the worksheet's and the data viewer's tables |

And it is written one way — as `_colors.scss` defines it: `t.$field-bg`, or that written out,
`var(--neo-field-bg, var(--neo-bg-elevated, #2c2c2c))` — so the dark screen, where no token is set,
shows one colour for it too. (A site that kept its own dark value after the token showed it: inputs
were one colour in a theme and seventeen without one.) Its states are the same everywhere too: a
field under the pointer takes the stronger line `border-color-strong`, a focused one the focus line
and ring (`interactive-field-active`); a search box is a field (`search-box`: the DB explorer's, the
package list's, a New tab panel's). One thing has one name: an input's fill is `field-bg` and
nothing else, a menu's background `menu-bg`, so the theme builder sets one colour for each.
`styleRules.test.ts` finds a field or a menu item by its selector and fails on any other
token there, and fails on a part's token written any other way than its definition.

**A colour that is no token** is a colour no theme can move. The ones that must stay — content's own
colours (chart options, data colours, a video's black, a brand's button), the light modes old code still
carries next to its dark rules, a developer page — are listed in `styleRules.allow.ts` with the reason;
an entry that no longer covers anything fails the test.

**Every token is written one way** — as the token sources define it: `t.$side-hover-bg`, or that written
out, `var(--neo-side-hover-bg, var(--neo-list-hover-bg, rgba(255, 255, 255, 0.13)))`. A site does not
carry a dark colour of its own after the token, so with no theme a token is one colour everywhere, as it
is in a theme. A token that falls back to another (a part's own, `bg-header`, `menu-border`…) names that
token in between, because a theme that leaves the part unset shows what the part falls back to;
theme-tokens.json says what each falls back to (`fallback`). The lines `styleRules.allow.ts` lets stand
keep their own (a light mode's line, a terminal's black, text on a yellow badge), and a chart's
literal→token table keeps the chart's colour; styleRules.test.ts checks every other site.

### What a colour is for

A site takes the token of what it **is**, not the token whose dark value happens to match: a selected row is a
selection (`selected-bg`, or its part's `*-active-bg`), a row under the pointer a hover (`*-hover-bg`), a field's box
a field (`field-*`), a popup a menu (`menu-bg`), a divider a line (`border-color-*`), content's deep background
the canvas (`bg-canvas`) — the frame (`bg-primary`) is only the frame's bars (GNB, tab bar, console bar, section bars,
result tab strips). With no theme a kind shows its token's one dark value — a selected row is the selection's
colour, not a hover's grey because the old dark screen drew it so — and a theme colours each kind its own way.

Text the same: an icon is `text-icon` (or its part's `*-icon`), a disabled control's text
`text-disabled`, and text that is merely muted — a count, an empty list's line, a note, a placeholder,
an inactive tab — is Muted text (`text-muted`), or its part's own (`side-text-muted` — counts, the
server version, meta lines —); a column name is `table-header-text`,
which falls back to Muted text, and a row number `table-row-number-text`, which falls back to the column names'. A menu item's words, a field's typed text, a dialog's words and a table's
values are the page's text (`text-primary`; a table's values `text-secondary`): a part has text of its own
only where its ground can be the other brightness from the page's (the GNB, the tab bar, the side panel,
the console, tooltips), or for a kind no shared token is (a table's column names, a dialog's title). The
icons in a field are `field-icon`. A signal as text takes its `-text` token (`warning-text`, `error-text`,
`success-text`) and the accent as text `accent-text`: a fill's colour does not read as text on a light
page. Otherwise changing a theme's icon colour would recolour placeholders and notes too.

### File-type icons

The file tree's icons keep the Material icon colours — they say what a thing is — and each colour is
a token (`icon-folder`, `icon-folder-git`, `icon-folder-public`, `icon-sql`, `icon-tql`, `icon-taz`,
`icon-wrk`, `icon-md`, `icon-json`, `icon-csv`, `icon-doc`, `icon-image`, `icon-svg`, `icon-shell`,
`icon-html`, `icon-css`, `icon-js`, `icon-dsh`, `icon-new`, …; `_colors.scss`). The SVGs read them as
`var(--neo-icon-folder, #FFCA28)`, so the dark screen is the Material colours. Under a light-scheme
theme the theme builder sets each one, from the same Material colour, only as deep as that theme's
own panels, selected row and tabs need at rest (2:1 — the file's name is beside it); a light theme that sets none gets deeper shades of the same hues (global.scss,
`:where(:root[data-neo-scheme='light'])`, all equally deep — luminance 0.13 — so they read on a
mid-tone tab bar, a hovered tab and a selected row). A theme that sets a token wins. The table types
in DB Explorer's tree have no tokens; under a light scheme they take deeper shades of their own hues
the same way (`--table-type-*`, luminance 0.16 — a light panel and its selected row). An icon keeps
its colour: it is deepened only as far as it needs to read, never to black (the theme builder stops
at oklch lightness 0.42).

### In the code

- A token: `color: t.$text-primary;` — follows the theme.
- Text on an accent fill (a selected chip, a primary or delete button) takes `t.$text-on-accent`,
  not `t.$text-primary`: a light theme's text-primary is dark and sinks into a saturated fill.
- In plain CSS and in `style={{ }}` objects a token is written out as it is defined:
  `var(--neo-text-secondary, #c4c4c4)` — the token's own dark value, not the one a design had
  (styleRules.test.ts fails on any other; a colour with no token is not given one this way — add the
  token, or list the line in styleRules.allow.ts with the reason).
- A token at an alpha: `t.alpha(t.$accent-light, 0.14)` (`color-mix`; Sass's `rgba($token, a)`
  cannot take a variable), or written out:
  `color-mix(in srgb, var(--neo-error-main, rgb(255, 83, 83)) 12%, transparent)`.
- A fill that carries text (a button, a badge, a status fill) takes a `-main` / `btn-*` token, whose
  dark value carries the white text-on-accent at 3:1 or more; its text takes text-on-accent. The
  neutral button (`neutral-main`) is the one fill whose text is text-primary. Text on the page takes the
  `-text` tokens (and accent-text), which paint nothing else.
- A chip, a badge or a status dot takes its colour family's: Accent (`accent-main`, `accent-text`),
  Success / Warning / Error / Info (`-main`, `-text`), or the neutral grey (`neutral-main`) — not a
  button's (`success-fill`, `button-danger-bg`) nor Accent's for an info one. A family changed changes every
  chip of it (the theme builder lists them under that colour).
- On a selected row (the selection colour, `selected-bg` / `side-selected-bg`) the row's icons, grey words
  and blue words take `selected-text`: the icon grey and the muted and accent text are lost on it.
- Where colours are data, not CSS (Monaco's editor theme): `resolveCssColor()` reads the value the
  current theme gives, and `useThemeVersion()` changes when the theme does.
- Chart options, canvas drawing and saved defaults are left as written: `var()` there breaks them.
- CSS that depends on the scheme rather than on a colour: the loader sets `data-neo-scheme`
  (`light`/`dark`) on `<html>` next to `data-neo-theme`, e.g. `:where(:root[data-neo-scheme='light'])`
  gives the file-type and table-type icons their deeper shades. With no theme there is no attribute.
- Charts the app draws itself through TQL (SQL result, FFT): `appChartTheme()` gives ECharts'
  `white` or `dark` and the surface colour, as values. The data viewer's ECharts options take a
  palette resolved from the tokens (`resolveDataViewerChartPalette()`).
- Library-drawn parts: tooltips (react-tooltip's `--rt-color-*`) take the `tooltip-*` tokens
  (global.scss); the terminal's "Default" theme takes `bg-primary`/`text-primary` (and light ANSI
  colours under a light scheme); mermaid diagrams take mermaid's light palette under a light scheme.

### Variables

Every theme variable (theme-tokens.json lists the same, with each one's kind and part).

| Variable | Dark default | Unset in a theme, shows |
| --- | --- | --- |
| `--neo-bg-primary` | `#1e1e1e` |  |
| `--neo-bg-secondary` | `#252525` |  |
| `--neo-bg-header` | `#1e1e1e` | `--neo-bg-primary` |
| `--neo-bg-elevated` | `#2c2c2c` |  |
| `--neo-bg-panel` | `#252525` |  |
| `--neo-sub-tab-active-bg` | `#2e2e2e` |  |
| `--neo-hover-bg` | `rgba(255, 255, 255, 0.08)` |  |
| `--neo-list-hover-bg` | `rgba(255, 255, 255, 0.13)` |  |
| `--neo-toolbar-hover-bg` | `rgba(255, 255, 255, 0.13)` |  |
| `--neo-selected-bg` | `rgb(0, 83, 160)` |  |
| `--neo-selected-hover-bg` | `rgb(0, 108, 210)` |  |
| `--neo-active-bg` | `rgb(0, 83, 160)` | `--neo-selected-bg` |
| `--neo-text-primary` | `#f1f1f1` |  |
| `--neo-text-secondary` | `#c4c4c4` |  |
| `--neo-text-tertiary` | `#a3a3a3` |  |
| `--neo-text-disabled` | `#818181` |  |
| `--neo-text-muted` | `#818181` |  |
| `--neo-text-icon` | `#818181` |  |
| `--neo-selected-text` | `rgb(243, 243, 243)` |  |
| `--neo-active-text` | `rgb(243, 243, 243)` | `--neo-selected-text` |
| `--neo-text-on-accent` | `#ffffff` |  |
| `--neo-border-color-default` | `rgba(255, 255, 255, 0.13)` |  |
| `--neo-border-color-strong` | `#767676` |  |
| `--neo-border-color-focus` | `rgb(0, 108, 210)` |  |
| `--neo-border-color-active` | `#005fb8` |  |
| `--neo-accent-main` | `#005fb8` |  |
| `--neo-accent-hover` | `#0075e2` |  |
| `--neo-accent-light` | `rgb(0, 108, 210)` |  |
| `--neo-accent-text` | `#4199ff` |  |
| `--neo-accent-dark` | `rgb(0, 83, 160)` |  |
| `--neo-success-main` | `#37aa3b` |  |
| `--neo-success-text` | `#9df486` |  |
| `--neo-error-main` | `rgb(255, 83, 83)` |  |
| `--neo-error-text` | `#fa6464` |  |
| `--neo-warning-main` | `#d67f00` |  |
| `--neo-warning-text` | `#ff9800` |  |
| `--neo-info-main` | `#005fb8` |  |
| `--neo-event-match-main` | `#ffdc72` |  |
| `--neo-button-danger-bg` | `#e53935` |  |
| `--neo-button-primary-bg` | `#005fb8` |  |
| `--neo-neutral-main` | `#6f7173` |  |
| `--neo-success-fill` | `#009688` |  |
| `--neo-button-disabled-bg` | `#6f7173` |  |
| `--neo-status-none` | `#717171` |  |
| `--neo-scrollbar-thumb` | `#5c5c5c` |  |
| `--neo-scrollbar-hover-thumb` | `#868686` |  |
| `--neo-scrollbar-border` | `#686868` |  |
| `--neo-scrollbar-track-bg` | `#2a2a2a` |  |
| `--neo-switch-bg` | `rgba(255, 255, 255, 0.13)` |  |
| `--neo-switch-hover-bg` | `rgba(255, 255, 255, 0.1)` |  |
| `--neo-switch-thumb` | `rgba(255, 255, 255, 0.3)` |  |
| `--neo-switch-active-thumb` | `#f1f1f1` |  |
| `--neo-switch-border` | `rgba(255, 255, 255, 0.13)` |  |
| `--neo-bg-backdrop` | `rgba(0, 0, 0, 0.5)` |  |
| `--neo-color-black` | `#000000` |  |
| `--neo-color-white` | `#ffffff` |  |
| `--neo-menu-shadow` | `0 4px 12px rgba(0, 0, 0, 0.3)` |  |
| `--neo-menu-bg` | `#2d2d2d` |  |
| `--neo-menu-border` | `rgba(255, 255, 255, 0.13)` | `--neo-border-color-default` |
| `--neo-menu-item-hover-bg` | `#3d3d3d` |  |
| `--neo-menu-item-icon` | `#b0b0b0` |  |
| `--neo-dialog-border` | `rgba(255, 255, 255, 0.13)` | `--neo-border-color-default` |
| `--neo-tooltip-bg` | `#222222` |  |
| `--neo-tooltip-text` | `#ffffff` |  |
| `--neo-tooltip-border` | `transparent` |  |
| `--neo-bg-canvas` | `#1e1e1e` | `--neo-bg-primary` |
| `--neo-icon-folder` | `#ffca28` |  |
| `--neo-icon-folder-git` | `#ff7043` |  |
| `--neo-icon-folder-git-mark` | `#ffccbc` |  |
| `--neo-icon-folder-public` | `rgb(66, 165, 245)` |  |
| `--neo-icon-sql` | `#ffca28` |  |
| `--neo-icon-tql` | `#4caf50` |  |
| `--neo-icon-taz` | `#26a69a` |  |
| `--neo-icon-taz-gray` | `#9fa2ab` |  |
| `--neo-icon-wrk` | `#42a5f5` |  |
| `--neo-icon-md` | `#42a5f5` |  |
| `--neo-icon-json` | `#fbc02d` |  |
| `--neo-icon-csv` | `#8bc34a` |  |
| `--neo-icon-doc` | `#78909c` |  |
| `--neo-icon-image` | `#26a69a` |  |
| `--neo-icon-svg` | `#ffb300` |  |
| `--neo-icon-shell` | `#ff7043` |  |
| `--neo-icon-powershell` | `#03a9f4` |  |
| `--neo-icon-new` | `#c4c4c4` |  |
| `--neo-icon-html` | `#fc7976` |  |
| `--neo-icon-css` | `#399af6` |  |
| `--neo-icon-js` | `#fdda19` |  |
| `--neo-icon-dsh` | `#fc7676` |  |
| `--neo-gnb-bg` | `#1e1e1e` | `--neo-bg-primary` |
| `--neo-gnb-icon` | `#818181` | `--neo-text-icon` |
| `--neo-gnb-active-icon` | `#f1f1f1` | `--neo-text-primary` |
| `--neo-gnb-marker` | `#005fb8` | `--neo-accent-main` |
| `--neo-gnb-hover-bg` | `rgba(255, 255, 255, 0.08)` | `--neo-hover-bg` |
| `--neo-tabbar-bg` | `#1e1e1e` | `--neo-bg-primary` |
| `--neo-tabbar-active-text` | `#f1f1f1` | `--neo-text-primary` |
| `--neo-tabbar-inactive-text` | `#a3a3a3` | `--neo-text-tertiary` |
| `--neo-tabbar-marker` | `#005fb8` | `--neo-accent-main` |
| `--neo-tabbar-active-bg` | `#252525` | `--neo-bg-secondary` |
| `--neo-tabbar-hover-bg` | `rgba(255, 255, 255, 0.08)` | `--neo-hover-bg` |
| `--neo-side-bg` | `#252525` | `--neo-bg-panel` |
| `--neo-side-header-bg` | `#1e1e1e` | `--neo-bg-header` |
| `--neo-side-text` | `#f1f1f1` | `--neo-text-primary` |
| `--neo-side-text-muted` | `#818181` | `--neo-text-muted` |
| `--neo-side-icon` | `#818181` | `--neo-text-icon` |
| `--neo-side-hover-bg` | `rgba(255, 255, 255, 0.13)` | `--neo-list-hover-bg` |
| `--neo-side-selected-bg` | `rgb(0, 83, 160)` | `--neo-selected-bg` |
| `--neo-console-bg` | `#1e1e1e` | `--neo-bg-primary` |
| `--neo-console-body-bg` | `#252525` | `--neo-bg-secondary` |
| `--neo-console-text` | `#f1f1f1` | `--neo-text-primary` |
| `--neo-console-text-muted` | `#c4c4c4` | `--neo-text-secondary` |
| `--neo-console-tab-text` | `#c4c4c4` | `--neo-console-text-muted` |
| `--neo-console-marker` | `#005fb8` | `--neo-border-color-active` |
| `--neo-console-icon` | `#818181` | `--neo-text-icon` |
| `--neo-console-hover-bg` | `rgba(255, 255, 255, 0.08)` | `--neo-hover-bg` |
| `--neo-console-selected-bg` | `rgb(0, 83, 160)` | `--neo-selected-bg` |
| `--neo-table-header-bg` | `#2c2c2c` | `--neo-bg-elevated` |
| `--neo-table-header-text` | `#818181` | `--neo-text-muted` |
| `--neo-table-row-number-text` | `#818181` | `--neo-table-header-text` |
| `--neo-table-stripe-bg` | `#2c2c2c` | `--neo-bg-elevated` |
| `--neo-table-row-hover-bg` | `rgba(255, 255, 255, 0.13)` | `--neo-list-hover-bg` |
| `--neo-table-row-selected-bg` | `rgb(0, 83, 160)` | `--neo-selected-bg` |
| `--neo-field-bg` | `#2c2c2c` | `--neo-bg-elevated` |
| `--neo-field-border` | `rgba(255, 255, 255, 0.13)` | `--neo-border-color-default` |
| `--neo-field-icon` | `#a3a3a3` | `--neo-text-tertiary` |
| `--neo-field-error-border` | `rgb(255, 83, 83)` | `--neo-error-main` |
| `--neo-field-disabled-bg` | `#1e1e1e` | `--neo-bg-primary` |
| `--neo-dialog-bg` | `#2c2c2c` | `--neo-bg-elevated` |
| `--neo-dialog-title-text` | `#f1f1f1` | `--neo-text-primary` |
| `--neo-shadow-sm` | `0 2px 2px rgba(0, 0, 0, 0.25)` |  |
| `--neo-shadow-md` | `0 4px 4px rgba(0, 0, 0, 0.25)` |  |
| `--neo-shadow-lg` | `0 8px 8px rgba(0, 0, 0, 0.25)` |  |
| `--neo-shadow-xl` | `0 10px 25px rgba(0, 0, 0, 0.5)` |  |
| `--neo-radius-scale` | `1` |  |
| `--neo-fx-cursor` | `none` |  |
