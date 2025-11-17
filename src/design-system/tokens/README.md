# Design System Tokens

SCSS design tokens extracted from ExtensionTab and Chat components.

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

.example-send-button {
  @include t.button-send;
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

.example-chat-input {
  @include t.input-chat;
  max-height: 200px;
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

.example-gradient-overlay {
  @include t.gradient-overlay;
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

-   `$font-size-xs` - 10px (Chat header)
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
-   `$border-radius-lg` - 10px (Chat input container)
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

All mixins are extracted from ExtensionTab and Chat UI patterns for real-world usage.

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

#### `button-send`
Chat send button style. Circular button with fixed dimensions.

---

### Input Mixins

#### `input-base`
Base input field styling. Includes background, border, padding, focus ring, and placeholder color.

#### `input-chat`
Chat-style input with larger border radius and no border. Includes resize: none for textareas.

#### `input-container`
Wrapper container for inputs with border. Handles focus-within state.

#### `chat-input-container`
Chat-specific input container with rounded corners and focus-within border color change.

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

#### `gradient-overlay($color: $bg-secondary)`
Gradient fade effect for scrollable content. Used in Chat view.

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
