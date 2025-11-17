# Combobox Component

A fully accessible, headless combobox (select + search) component built with React and TypeScript.

## Features

- ✅ **Headless Architecture** - Separates logic from UI for maximum flexibility
- ✅ **Fully Accessible** - ARIA compliant with proper roles and keyboard navigation
- ✅ **Keyboard Navigation** - Arrow keys, Enter, Escape, Tab, Home, End
- ✅ **Search/Filter** - Real-time option filtering as you type
- ✅ **Compound Components** - Composable API for custom layouts
- ✅ **TypeScript** - Full type safety
- ✅ **Design Tokens** - Uses SCSS tokens from design system
- ✅ **Auto-scroll** - Focused option automatically scrolls into view
- ✅ **Outside Click** - Closes dropdown when clicking outside
- ✅ **Disabled State** - Support for disabled options and entire component
- ✅ **Clear Button** - Optional clear selection button
- ✅ **Custom Rendering** - Render custom option content

---

## Installation

```tsx
import { Combobox } from '@/design-system/components/Combobox';
```

---

## Basic Usage

```tsx
import { Combobox, ComboboxOption } from '@/design-system/components/Combobox';

const options: ComboboxOption[] = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
];

function MyComponent() {
    const [value, setValue] = useState('');

    return (
        <Combobox.Root
            options={options}
            value={value}
            onChange={setValue}
            placeholder="Select a fruit"
        >
            <Combobox.Input />
            <Combobox.Trigger />
            <Combobox.Dropdown>
                <Combobox.List>
                    {options.map((option, index) => (
                        <Combobox.Option
                            key={option.value}
                            option={option}
                            index={index}
                        />
                    ))}
                </Combobox.List>
            </Combobox.Dropdown>
        </Combobox.Root>
    );
}
```

---

## API Reference

### Combobox.Root

The root container that provides context to all child components.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `ComboboxOption[]` | **required** | Array of selectable options |
| `value` | `string` | `undefined` | Controlled value |
| `defaultValue` | `string` | `''` | Default value for uncontrolled usage |
| `onChange` | `(value: string) => void` | `undefined` | Callback when selection changes |
| `onSearch` | `(query: string) => void` | `undefined` | Callback when search query changes |
| `placeholder` | `string` | `'Select an option'` | Input placeholder text |
| `disabled` | `boolean` | `false` | Disable the entire combobox |
| `searchable` | `boolean` | `true` | Enable search/filter functionality |
| `clearable` | `boolean` | `false` | Show clear button when value is selected |
| `className` | `string` | `undefined` | Additional CSS class |
| `children` | `ReactNode` | **required** | Child components |

**Example:**

```tsx
<Combobox.Root
    options={options}
    value={selectedValue}
    onChange={setSelectedValue}
    onSearch={(query) => console.log('Searching:', query)}
    placeholder="Search fruits..."
    searchable
    clearable
>
    {/* children */}
</Combobox.Root>
```

---

### Combobox.Input

The input field for displaying selected value and typing search queries.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `undefined` | Additional CSS class |

**Features:**
- Displays selected option label
- Becomes editable when searchable is enabled
- Opens dropdown on focus (when searchable)
- Full keyboard navigation support

---

### Combobox.Trigger

The button that toggles the dropdown open/closed.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `undefined` | Additional CSS class |
| `children` | `ReactNode` | Chevron icon | Custom trigger content |

**Default Behavior:**
- Shows chevron-down icon by default
- Rotates 180° when dropdown is open
- Can be replaced with custom content

**Example:**

```tsx
{/* Default chevron */}
<Combobox.Trigger />

{/* Custom trigger */}
<Combobox.Trigger>
    <MyCustomIcon />
</Combobox.Trigger>
```

---

### Combobox.Clear

Optional clear button to reset selection.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `undefined` | Additional CSS class |

**Features:**
- Only renders when a value is selected
- Positioned between input and trigger button
- Shows X icon by default

---

### Combobox.Dropdown

Container for the dropdown list. Handles visibility based on `isOpen` state.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `undefined` | Additional CSS class |
| `children` | `ReactNode` | **required** | Dropdown content (usually Combobox.List) |

**Features:**
- Automatically positioned below input
- Animates in with slide-down + fade effect
- Hidden when dropdown is closed

---

### Combobox.List

The scrollable list container for options.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `undefined` | Additional CSS class |
| `emptyMessage` | `string` | `'No results found'` | Message when no options match |
| `children` | `ReactNode` | **required** | Option components |

**Features:**
- Custom scrollbar styling
- Shows empty message when no filtered results
- Max height 300px with scroll

---

### Combobox.Option

Individual selectable option.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `option` | `ComboboxOption` | **required** | Option data object |
| `index` | `number` | **required** | Index in filtered options array |
| `className` | `string` | `undefined` | Additional CSS class |
| `children` | `ReactNode` | Default layout | Custom option content |

**Option Object:**

```typescript
interface ComboboxOption {
    value: string;      // Unique value
    label: string;      // Display text
    disabled?: boolean; // Disabled state
}
```

**Default Rendering:**
- Shows option label
- Shows checkmark icon when selected
- Supports disabled state

**Custom Rendering:**

```tsx
<Combobox.Option option={option} index={index}>
    <div className="custom-option">
        <img src={option.icon} alt="" />
        <span>{option.label}</span>
        <span>{option.subtitle}</span>
    </div>
</Combobox.Option>
```

---

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `ArrowDown` | Move focus to next option (opens dropdown if closed) |
| `ArrowUp` | Move focus to previous option (opens dropdown if closed) |
| `Enter` | Select focused option (or open dropdown if closed) |
| `Escape` | Close dropdown and clear search |
| `Tab` | Close dropdown and move focus away |
| `Home` | Focus first option |
| `End` | Focus last option |
| Typing | Filter options by search query |

---

## Examples

### Basic Combobox

```tsx
const [value, setValue] = useState('');

<Combobox.Root options={fruits} value={value} onChange={setValue}>
    <Combobox.Input />
    <Combobox.Trigger />
    <Combobox.Dropdown>
        <Combobox.List>
            {fruits.map((option, index) => (
                <Combobox.Option key={option.value} option={option} index={index} />
            ))}
        </Combobox.List>
    </Combobox.Dropdown>
</Combobox.Root>
```

### With Clear Button

```tsx
<Combobox.Root
    options={fruits}
    value={value}
    onChange={setValue}
    clearable
>
    <Combobox.Input />
    <Combobox.Clear />  {/* Add clear button */}
    <Combobox.Trigger />
    <Combobox.Dropdown>
        <Combobox.List>
            {fruits.map((option, index) => (
                <Combobox.Option key={option.value} option={option} index={index} />
            ))}
        </Combobox.List>
    </Combobox.Dropdown>
</Combobox.Root>
```

### Searchable with Custom Empty Message

```tsx
const [searchQuery, setSearchQuery] = useState('');

<Combobox.Root
    options={fruits}
    value={value}
    onChange={setValue}
    onSearch={setSearchQuery}
    searchable
>
    <Combobox.Input />
    <Combobox.Trigger />
    <Combobox.Dropdown>
        <Combobox.List emptyMessage={`No results for "${searchQuery}"`}>
            {fruits.map((option, index) => (
                <Combobox.Option key={option.value} option={option} index={index} />
            ))}
        </Combobox.List>
    </Combobox.Dropdown>
</Combobox.Root>
```

### Disabled State

```tsx
<Combobox.Root
    options={fruits}
    value={value}
    onChange={setValue}
    disabled  {/* Entire combobox disabled */}
>
    <Combobox.Input />
    <Combobox.Trigger />
    <Combobox.Dropdown>
        <Combobox.List>
            {fruits.map((option, index) => (
                <Combobox.Option key={option.value} option={option} index={index} />
            ))}
        </Combobox.List>
    </Combobox.Dropdown>
</Combobox.Root>

{/* Disabled individual options */}
const options = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana', disabled: true },
];
```

### Custom Option Rendering

```tsx
<Combobox.List>
    {colorOptions.map((option, index) => (
        <Combobox.Option key={option.value} option={option} index={index}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                    style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: option.value
                    }}
                />
                <span>{option.label}</span>
            </div>
        </Combobox.Option>
    ))}
</Combobox.List>
```

---

## Accessibility

This component follows WAI-ARIA Combobox Pattern:

- `role="combobox"` on input
- `aria-expanded` indicates dropdown state
- `aria-controls` links input to listbox
- `aria-activedescendant` indicates focused option
- `aria-autocomplete="list"` for searchable mode
- `role="listbox"` on dropdown list
- `role="option"` on each option
- `aria-selected` indicates selected state
- `aria-disabled` for disabled options
- Full keyboard navigation support
- Focus management and auto-scroll

---

## Styling

The component uses design tokens from `@/design-system/tokens`:

```scss
@use '@/design-system/tokens' as t;

.combobox__input {
    @include t.input-base;
}

.combobox__option {
    @include t.hover-bg;

    &--selected {
        @include t.active-state;
    }
}
```

**Available CSS Classes:**

- `.combobox` - Root container
- `.combobox__input-wrapper` - Input wrapper
- `.combobox__input` - Input field
- `.combobox__trigger` - Trigger button
- `.combobox__trigger-icon` - Chevron icon
- `.combobox__trigger-icon--open` - Rotated chevron
- `.combobox__clear` - Clear button
- `.combobox__dropdown` - Dropdown container
- `.combobox__list` - Options list
- `.combobox__option` - Individual option
- `.combobox__option--selected` - Selected option
- `.combobox__option--focused` - Focused option
- `.combobox__option--disabled` - Disabled option
- `.combobox__option-label` - Option label text
- `.combobox__option-check` - Checkmark icon
- `.combobox__empty` - Empty state message

---

## Advanced Usage

### Controlled vs Uncontrolled

```tsx
// Controlled
const [value, setValue] = useState('apple');
<Combobox.Root value={value} onChange={setValue} />

// Uncontrolled
<Combobox.Root defaultValue="apple" />
```

### Dynamic Options

```tsx
const [options, setOptions] = useState([]);

useEffect(() => {
    fetchOptions().then(setOptions);
}, []);

<Combobox.Root options={options} />
```

### Async Search

```tsx
const [options, setOptions] = useState([]);

const handleSearch = async (query: string) => {
    const results = await searchAPI(query);
    setOptions(results);
};

<Combobox.Root
    options={options}
    onSearch={handleSearch}
    searchable
/>
```

---

## File Structure

```
src/design-system/components/Combobox/
├── index.tsx       # Main component
├── index.scss      # Styles using design tokens
├── example.tsx     # Usage examples
└── README.md       # Documentation (this file)
```

**Related Files:**

- [useCombobox.ts](../../hooks/useCombobox.ts) - Headless logic hook
- [Design Tokens](../../tokens/README.md) - SCSS variables and mixins
- [useOutsideClick.ts](../../../hooks/useOutsideClick.ts) - Outside click detection

---

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires ES6+ support
- Uses CSS Grid and Flexbox
- Custom scrollbar styling (webkit only)

---

## Tips

1. **Always provide a key** for options to prevent rendering issues
2. **Use index from filteredOptions** for proper keyboard navigation
3. **Custom rendering** can be applied to any compound component
4. **Searchable mode** automatically opens dropdown on input focus
5. **Disabled options** are skipped during keyboard navigation
6. **Clear button** requires `clearable` prop to show
7. **Outside click** automatically closes dropdown
