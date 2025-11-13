# Button Component

A flexible and accessible button component with multiple variants, sizes, and states.

## Features

- **Multiple Variants**: Primary, Secondary, Ghost, Danger
- **Flexible Sizes**: Small, Medium, Large
- **Loading State**: Built-in spinner
- **Icon Support**: Left or right positioned icons
- **Icon-only Buttons**: Dedicated IconButton component
- **Full Width Option**: Span entire container width
- **Accessibility**: Full keyboard navigation and ARIA support
- **CSS Modules**: No style conflicts

## Installation

```typescript
import { Button, IconButton } from '@/design-system/components';
```

## Basic Usage

```tsx
import { Button } from '@/design-system/components';

function Example() {
    return (
        <div>
            <Button variant="primary">Click Me</Button>
            <Button variant="secondary">Cancel</Button>
        </div>
    );
}
```

## Props

### Button Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | Button style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `loading` | `boolean` | `false` | Show loading spinner |
| `disabled` | `boolean` | `false` | Disable button |
| `icon` | `ReactNode` | - | Icon element |
| `iconPosition` | `'left' \| 'right'` | `'left'` | Icon position |
| `fullWidth` | `boolean` | `false` | Make button full width |
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode` | - | Button content |

Inherits all standard HTML button attributes (`onClick`, `type`, `disabled`, etc.)

### IconButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `ReactNode` | **required** | Icon element |
| `aria-label` | `string` | **required** | Accessibility label |
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | Button style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |

All other Button props except `children`, `iconPosition`

## Examples

### Variants

```tsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
```

### Sizes

```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

### Loading State

```tsx
function LoadingExample() {
    const [loading, setLoading] = useState(false);

    const handleClick = () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => setLoading(false), 2000);
    };

    return (
        <Button variant="primary" loading={loading} onClick={handleClick}>
            {loading ? 'Saving...' : 'Save'}
        </Button>
    );
}
```

### With Icons

```tsx
const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" />
    </svg>
);

// Icon on left (default)
<Button variant="primary" icon={<PlusIcon />}>
    Add Item
</Button>

// Icon on right
<Button variant="primary" icon={<PlusIcon />} iconPosition="right">
    Add Item
</Button>
```

### Icon Only Buttons

```tsx
const SettingsIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="..." stroke="currentColor" />
    </svg>
);

<IconButton
    variant="primary"
    icon={<SettingsIcon />}
    aria-label="Settings"
/>
```

### Disabled State

```tsx
<Button variant="primary" disabled>
    Disabled Button
</Button>
```

### Full Width

```tsx
<Button variant="primary" fullWidth>
    Full Width Button
</Button>
```

### Custom Styling

```tsx
<Button
    variant="primary"
    className="my-custom-class"
    style={{ minWidth: '200px' }}
>
    Custom Button
</Button>
```

## Variants

### Primary
- **Use**: Main call-to-action buttons
- **Color**: Blue (`rgb(0, 108, 210)`)
- **Example**: "Save", "Submit", "Confirm"

### Secondary
- **Use**: Secondary actions
- **Color**: Transparent with border
- **Example**: "Cancel", "Back"

### Ghost
- **Use**: Subtle actions
- **Color**: Transparent, no border
- **Example**: "Learn More", "Skip"

### Danger
- **Use**: Destructive actions
- **Color**: Red (`#e53935`)
- **Example**: "Delete", "Remove"

## Accessibility

- Full keyboard navigation support
- Focus visible indicator
- ARIA attributes
- `aria-label` required for IconButton
- Disabled state properly communicated

## Styling

Uses CSS Modules to prevent style conflicts. All styles scoped to component.

### Design Tokens Used
- Colors: Primary blue, text colors, hover states
- Spacing: Consistent padding and gaps
- Typography: Font sizes for different sizes
- Border Radius: Consistent with design system
- Transitions: Smooth hover and active states

## Best Practices

1. **Use appropriate variants**:
   - Primary for main actions
   - Secondary for alternative actions
   - Danger for destructive actions

2. **Always provide accessible labels**:
   ```tsx
   <IconButton icon={<Icon />} aria-label="Close" />
   ```

3. **Use loading state for async actions**:
   ```tsx
   <Button loading={isSubmitting}>Submit</Button>
   ```

4. **Keep button text concise**:
   - Good: "Save", "Delete", "Add Item"
   - Avoid: "Click here to save your changes"

5. **Use icons to enhance clarity**:
   ```tsx
   <Button icon={<TrashIcon />}>Delete</Button>
   ```

## TypeScript

Fully typed with TypeScript. Export types:

```typescript
import type { ButtonProps, ButtonVariant, ButtonSize, IconButtonProps } from '@/design-system/components';
```
