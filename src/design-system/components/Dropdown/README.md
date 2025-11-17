# Dropdown Component

A simple, accessible dropdown (select) component built with React and TypeScript. Inspired by the ProviderModal dropdown UI pattern.

## Features

- **Accessible**: Full keyboard navigation and ARIA attributes support
- **Customizable**: Flexible styling with CSS modules and design tokens
- **Compound Components**: Composable API for maximum flexibility
- **TypeScript**: Full type safety
- **Controlled/Uncontrolled**: Supports both controlled and uncontrolled usage
- **Keyboard Navigation**: Arrow keys, Enter, Escape, Home, End
- **Outside Click Detection**: Automatically closes when clicking outside

## Basic Usage

```tsx
import { Dropdown } from '@/design-system/components';

const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
];

function MyComponent() {
    const [value, setValue] = useState('');

    return (
        <Dropdown.Root options={options} value={value} onChange={setValue} placeholder="Select an option">
            <Dropdown.Trigger />
            <Dropdown.Menu>
                <Dropdown.List />
            </Dropdown.Menu>
        </Dropdown.Root>
    );
}
```

## API Reference

### Dropdown.Root

The root container component that manages dropdown state.

#### Props

| Prop           | Type                  | Default              | Description                          |
| -------------- | --------------------- | -------------------- | ------------------------------------ |
| `options`      | `DropdownOption[]`    | Required             | Array of dropdown options            |
| `value`        | `string`              | `undefined`          | Controlled value                     |
| `defaultValue` | `string`              | `undefined`          | Initial value for uncontrolled usage |
| `onChange`     | `(value: string) => void` | `undefined`      | Callback when selection changes      |
| `disabled`     | `boolean`             | `false`              | Disables the entire dropdown         |
| `placeholder`  | `string`              | `'Select an option'` | Placeholder text when no selection   |
| `className`    | `string`              | `undefined`          | Additional CSS class                 |

### Dropdown.Trigger

The button that displays the selected value and opens the dropdown.

#### Props

| Prop        | Type                                                              | Default     | Description                        |
| ----------- | ----------------------------------------------------------------- | ----------- | ---------------------------------- |
| `className` | `string`                                                          | `undefined` | Additional CSS class               |
| `children`  | `(selectedOption: DropdownOption \| undefined, isOpen: boolean) => ReactNode` | Default render | Custom render function |

### Dropdown.Menu

The dropdown menu container that appears when the dropdown is open.

#### Props

| Prop        | Type        | Default     | Description          |
| ----------- | ----------- | ----------- | -------------------- |
| `className` | `string`    | `undefined` | Additional CSS class |
| `children`  | `ReactNode` | Required    | Menu content         |

### Dropdown.List

The list component that renders all options.

#### Props

| Prop        | Type                                                | Default        | Description                   |
| ----------- | --------------------------------------------------- | -------------- | ----------------------------- |
| `className` | `string`                                            | `undefined`    | Additional CSS class          |
| `children`  | `(option: DropdownOption, index: number) => ReactNode` | Default render | Custom option render function |

### Dropdown.Option

Individual option item. Automatically used by `Dropdown.List` but can be customized.

#### Props

| Prop        | Type             | Default        | Description               |
| ----------- | ---------------- | -------------- | ------------------------- |
| `option`    | `DropdownOption` | Required       | Option data               |
| `index`     | `number`         | Required       | Option index              |
| `className` | `string`         | `undefined`    | Additional CSS class      |
| `children`  | `ReactNode`      | Default render | Custom option render      |

## Types

### DropdownOption

```typescript
interface DropdownOption {
    value: string;
    label: string;
    disabled?: boolean;
}
```

## Examples

### Basic Dropdown

```tsx
<Dropdown.Root options={options} value={value} onChange={setValue}>
    <Dropdown.Trigger />
    <Dropdown.Menu>
        <Dropdown.List />
    </Dropdown.Menu>
</Dropdown.Root>
```

### With Custom Trigger

```tsx
<Dropdown.Root options={options} value={value} onChange={setValue}>
    <Dropdown.Trigger>
        {(selectedOption, isOpen) => (
            <>
                <span>{selectedOption?.label || 'Choose...'}</span>
                <MyCustomIcon isOpen={isOpen} />
            </>
        )}
    </Dropdown.Trigger>
    <Dropdown.Menu>
        <Dropdown.List />
    </Dropdown.Menu>
</Dropdown.Root>
```

### With Custom Options

```tsx
<Dropdown.Root options={options} value={value} onChange={setValue}>
    <Dropdown.Trigger />
    <Dropdown.Menu>
        <Dropdown.List>
            {(option, index) => (
                <Dropdown.Option key={option.value} option={option} index={index}>
                    <div className="custom-option">
                        <Icon name={option.value} />
                        <span>{option.label}</span>
                    </div>
                </Dropdown.Option>
            )}
        </Dropdown.List>
    </Dropdown.Menu>
</Dropdown.Root>
```

### Disabled Options

```tsx
const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2 (Disabled)', disabled: true },
    { value: 'option3', label: 'Option 3' },
];

<Dropdown.Root options={options} value={value} onChange={setValue}>
    <Dropdown.Trigger />
    <Dropdown.Menu>
        <Dropdown.List />
    </Dropdown.Menu>
</Dropdown.Root>
```

### Disabled Dropdown

```tsx
<Dropdown.Root options={options} value={value} onChange={setValue} disabled>
    <Dropdown.Trigger />
    <Dropdown.Menu>
        <Dropdown.List />
    </Dropdown.Menu>
</Dropdown.Root>
```

## Keyboard Navigation

- **Enter / Space**: Open dropdown or select focused option
- **Escape**: Close dropdown
- **Arrow Down**: Move focus to next option or open dropdown
- **Arrow Up**: Move focus to previous option
- **Home**: Jump to first option
- **End**: Jump to last option

## Accessibility

The component follows WAI-ARIA best practices:

- Uses proper ARIA roles (`listbox`, `option`)
- Includes ARIA states (`aria-expanded`, `aria-selected`, `aria-disabled`)
- Supports keyboard navigation
- Announces state changes to screen readers
- Focus management

## Styling

The component uses CSS modules with design tokens. You can customize styling by:

1. Using the `className` prop on any component
2. Modifying design tokens in `@/design-system/tokens`
3. Overriding CSS module classes

### Available CSS Classes

- `.dropdown` - Root container
- `.dropdown__trigger` - Trigger button
- `.dropdown__trigger--placeholder` - Placeholder state
- `.dropdown__trigger--has-value` - Has selected value state
- `.dropdown__menu` - Dropdown menu
- `.dropdown__list` - Options list
- `.dropdown__option` - Individual option
- `.dropdown__option--selected` - Selected option
- `.dropdown__option--focused` - Focused option
- `.dropdown__option--disabled` - Disabled option

## Comparison with Combobox

| Feature          | Dropdown | Combobox |
| ---------------- | -------- | -------- |
| Search/Filter    | No       | Yes      |
| Free text input  | No       | Yes      |
| Keyboard nav     | Yes      | Yes      |
| Custom options   | Yes      | Yes      |
| Use case         | Simple select | Searchable select |

Use **Dropdown** for simple selection from a predefined list.
Use **Combobox** when you need search/filtering or allow custom input.
