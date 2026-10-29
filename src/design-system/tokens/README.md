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
  background-color: t.$btn-create;
  color: t.$text-primary;
  padding: t.$spacing-8 t.$spacing-16;
  font-size: t.$font-size-base;
  border-radius: t.$border-radius-sm;
  transition: t.$transition-default;

  &:hover {
    background-color: t.$primary-hover;
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

#### Background

-   `$bg-primary` - Main background (#1c1c21)
-   `$bg-secondary` - Secondary background (#1b1c21)
-   `$bg-header` - Header background (#262831)
-   `$bg-input` - Input background (rgba(255, 255, 255, 0.13))
-   `$bg-hover` - Hover state background
-   `$bg-active` - Active state background

#### Text

-   `$text-primary` - Primary text (#f1f1f1)
-   `$text-on-accent` - Text and icons on an accent fill: primary, create, delete, error, warning (#f1f1f1)
-   `$text-secondary` - Secondary text (#c4c4c4)
-   `$text-disabled` - Disabled text (#818181)
-   `$text-hint` - Hint text (#aaaaaa)

#### Buttons

-   `$btn-create` - Create button (#005fb8)
-   `$btn-delete` - Delete button (#ff4747)
-   `$btn-copy` - Copy button (#6f7173)
-   `$btn-status` - Status button (#009688)

#### Primary

-   `$primary-base` - Base primary color (#005fb8)
-   `$primary-hover` - Hover state (#0075e2)

#### Semantic

-   `$success-main` - Success color (#71e071)
-   `$error-main` - Error color (rgb(255, 83, 83))
-   `$warning-main` - Warning color (#ff9800)

#### Border

-   `$border-default` - Default border (rgba(255, 255, 255, 0.13))
-   `$border-focus` - Focus border (rgb(0, 108, 210))
-   `$border-active` - Active border (#005fb8)

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

#### `hover-bg($bg-color: $bg-hover)`
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

The theme builder saves a user's own themes in the browser, not on the server:
`localStorage['neo.themes.<user>']` (the user is the sign-in token's `sub`) holds
`[{ id, label, scheme, css, swatch, note }]`, and such a theme is chosen as
`{ pkg: '@local', stylesheet: '<id>.css' }`. Nobody else can change it — another account on the
same server included — and saving needs no write permission. Only the `--neo-*` declarations of
the kept text are applied (`localThemeCss`).

The choice is kept per user too (`neo.theme.<user>`, Dark included) and as the browser's last
(`neo.theme`): the sign-in page, before the user is known, paints the last one (from the
remembered copy for a browser theme), and signing in applies the user's own. Settings → Theme
lists the user's browser themes under **My themes**; another user on the same browser does not
see them.

### Corners

Every corner radius is `calc(<size> * var(--neo-radius-scale, 1))`: the `$border-radius-*` tokens
(`_border-radius.scss`) and the radii written in place alike. With no theme the scale is 1 and
every corner is the size written; a theme sets `--neo-radius-scale` (0 square, 2 twice as round).
Circles (`50%`, a dot whose radius is half its size) and pills (20px and over) do not scale. A
new corner that is not a token: `border-radius: t.rounded(6px)`.

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

Settings → Theme lists the built-in Dark, the user's own browser themes and every installed
theme. The choice is kept per user and per browser (localStorage `neo.theme.<user>` and
`neo.theme`, with the stylesheet path) and applied before the first render,
so a reload paints in the theme from its first frame. A theme whose package was uninstalled (or
that was deleted from its package's list) falls back to Dark; the Theme dialog then forgets it.

### In the code

- A token: `color: t.$text-primary;` — follows the theme.
- Text on an accent fill (a selected chip, a primary or delete button) takes `t.$text-on-accent`,
  not `t.$text-primary`: a light theme's text-primary is dark and sinks into a saturated fill.
- A colour that is not a token yet: `color: t.themed(text-secondary, #c3c3c3);` — stays `#c3c3c3`
  on the dark screen and follows `--neo-text-secondary` under a theme. In plain CSS and in
  `style={{ }}` objects the same is written `var(--neo-text-secondary, #c3c3c3)`.
- A token at an alpha: `t.alpha(t.$primary-light, 0.14)` (`color-mix`; Sass's `rgba($token, a)`
  cannot take a variable). A translucent literal is written the same way:
  `color-mix(in srgb, var(--neo-btn-delete, rgb(239, 68, 68)) 12%, transparent)`.
- Where colours are data, not CSS (Monaco's editor theme): `resolveCssColor()` reads the value the
  current theme gives, and `useThemeVersion()` changes when the theme does.
- Chart options, canvas drawing and saved defaults are left as written: `var()` there breaks them.
- CSS that depends on the scheme rather than on a colour: the loader sets `data-neo-scheme`
  (`light`/`dark`) on `<html>` next to `data-neo-theme`, e.g. `:root[data-neo-scheme='light']
  .neo-type-icon` deepens the file-type icons. With no theme there is no attribute.
- Charts the app draws itself through TQL (SQL result, FFT): `appChartTheme()` gives ECharts'
  `white` or `dark` and the surface colour, as values. The data viewer's ECharts options take a
  palette resolved from the tokens (`resolveDataViewerChartPalette()`).
- Library-drawn parts: tooltips (react-tooltip's `--rt-color-*`) take the `tooltip-*` tokens
  (global.scss); the terminal's "Default" theme takes `bg-primary`/`text-primary` (and light ANSI
  colours under a light scheme); mermaid diagrams take mermaid's light palette under a light scheme.

### Variables

| Variable | Dark default |
| --- | --- |
| `--neo-bg-primary` | `#1e1e1e` |
| `--neo-bg-secondary` | `#252525` |
| `--neo-bg-header` | `$bg-primary` |
| `--neo-bg-elevated` | `#2c2c2c` |
| `--neo-bg-panel` | `#252525` |
| `--neo-bg-tab-active` | `#252525` |
| `--neo-bg-sub-tab-active` | `#2e2e2e` |
| `--neo-bg-tab-hover` | `rgba(255, 255, 255, 0.08)` |
| `--neo-bg-input` | `rgba(255, 255, 255, 0.13)` |
| `--neo-bg-input-dark` | `#353535` |
| `--neo-bg-hover` | `rgba(255, 255, 255, 0.08)` |
| `--neo-bg-hover-light` | `rgb(75, 75, 75)` |
| `--neo-bg-hover-block` | `rgba(255, 255, 255, 0.13)` |
| `--neo-bg-active` | `rgb(0, 83, 160)` |
| `--neo-bg-active-hover` | `rgb(0, 108, 210)` |
| `--neo-bg-user-message` | `rgb(50, 50, 51)` |
| `--neo-text-primary` | `#f1f1f1` |
| `--neo-text-secondary` | `#c4c4c4` |
| `--neo-text-tertiary` | `#a3a3a3` |
| `--neo-text-disabled` | `#818181` |
| `--neo-text-muted` | `#727272` |
| `--neo-text-hint` | `#aaaaaa` |
| `--neo-text-row-number` | `#3b3b3b` |
| `--neo-text-active` | `rgb(243, 243, 243)` |
| `--neo-text-on-accent` | `#f1f1f1` |
| `--neo-bg-backdrop` | `rgba(0, 0, 0, 0.5)` (the layer behind a modal; sites keep their own alpha) |
| `--neo-border-color-default` | `rgba(255, 255, 255, 0.13)` |
| `--neo-border-color-light` | `#f1f1f125` |
| `--neo-border-color-medium` | `#626263` |
| `--neo-border-color-focus` | `rgb(0, 108, 210)` |
| `--neo-border-color-active` | `#005fb8` |
| `--neo-primary-base` | `#005fb8` |
| `--neo-primary-hover` | `#0075e2` |
| `--neo-primary-light` | `rgb(0, 108, 210)` |
| `--neo-primary-dark` | `rgb(0, 83, 160)` |
| `--neo-success-main` | `#71e071` |
| `--neo-success-light` | `#9df486` |
| `--neo-error-main` | `rgb(255, 83, 83)` |
| `--neo-error-light` | `#fa6464` |
| `--neo-warning-main` | `#ff9800` |
| `--neo-info-main` | `#005fb8` |
| `--neo-event-match-main` | `#ffdc72` |
| `--neo-btn-delete` | `#ff4747` |
| `--neo-btn-create` | `#005fb8` |
| `--neo-btn-copy` | `#6f7173` |
| `--neo-btn-status` | `#009688` |
| `--neo-btn-disabled` | `#6f7173` |
| `--neo-btn-send` | `#5b5b5b` |
| `--neo-btn-send-border` | `#626263` |
| `--neo-status-true` | `#9df486` |
| `--neo-status-false` | `#fa6464` |
| `--neo-status-none` | `#717171` |
| `--neo-scrollbar-thumb` | `#5c5c5c` |
| `--neo-scrollbar-thumb-hover` | `#868686` |
| `--neo-scrollbar-border` | `#686868` |
| `--neo-scrollbar-track-bg` | `#2a2a2a` |
| `--neo-scrollbar-thumb-light` | `#ffffffcc` |
| `--neo-scrollbar-thumb-light-hover` | `#ffffff` |
| `--neo-scrollbar-border-light` | `#ffffffcc` |
| `--neo-scrollbar-track-light-bg` | `#ffffff0f` |
| `--neo-switch-bg` | `rgba(255, 255, 255, 0.13)` |
| `--neo-switch-bg-hover` | `rgba(255, 255, 255, 0.1)` |
| `--neo-switch-bg-active` | `#005fb8` |
| `--neo-switch-bg-active-hover` | `#0075e2` |
| `--neo-switch-thumb` | `rgba(255, 255, 255, 0.3)` |
| `--neo-switch-thumb-active` | `#f1f1f1` |
| `--neo-switch-border` | `rgba(255, 255, 255, 0.13)` |
| `--neo-switch-border-active` | `#0075e2` |
| `--neo-selector-bg` | `rgba(255, 255, 255, 0.13)` |
| `--neo-selector-border` | `rgba(255, 255, 255, 0.13)` |
| `--neo-selector-hover` | `#005fb8` |
| `--neo-selector-selected` | `#005fb8` |
| `--neo-overlay-shadow` | `#00000020` |
| `--neo-color-black` | `#000000` |
| `--neo-color-white` | `#ffffff` |
| `--neo-mui-selected` | `#005fb8` |
| `--neo-mui-text` | `#c4c4c4` |
| `--neo-dropdown-bg` | `#2d2d2d` |
| `--neo-dropdown-border` | `$border-color-default` |
| `--neo-dropdown-shadow` | `0 4px 12px rgba(0, 0, 0, 0.3)` |
| `--neo-dropdown-option-hover-bg` | `#3d3d3d` |
| `--neo-dropdown-trigger-icon-color` | `#7a7a7a` |
| `--neo-dropdown-option-hover-bg-light` | `rgba(255, 255, 255, 0.05)` |
| `--neo-menu-bg` | `$dropdown-bg` |
| `--neo-menu-border` | `$dropdown-border` |
| `--neo-menu-item-text` | `#e8e8e8` |
| `--neo-menu-item-hover-bg` | `$dropdown-option-hover-bg` |
| `--neo-menu-item-icon` | `#b0b0b0` |
| `--neo-modal-border` | `$border-color-default` |
| `--neo-tooltip-bg` | `#222222` |
| `--neo-tooltip-text` | `#ffffff` |
| `--neo-tooltip-border` | `transparent` |
| `--neo-tag-table` | `$info-main` |
| `--neo-log-table` | `$btn-delete` |
| `--neo-kv-table` | `$btn-status` |
| `--neo-vol-table` | `$warning-main` |
| `--neo-etc-table` | `#ffdc72` |
| `--neo-shadow-switch` | `1px 2px 3px #00000020` |
| `--neo-shadow-sm` | `0 2px 2px rgba(0, 0, 0, 0.25)` |
| `--neo-shadow-md` | `0 4px 4px rgba(0, 0, 0, 0.25)` |
| `--neo-shadow-lg` | `0 8px 8px rgba(0, 0, 0, 0.25)` |
| `--neo-shadow-xl` | `0 10px 25px rgba(0, 0, 0, 0.5)` |
