# Input Component

A flexible, accessible input component with support for various sizes, states, icons, and validation.

## Features

- 🎨 Multiple sizes (sm, md, lg)
- 🎯 Multiple variants (default, error, success)
- 🏷️ Optional labels and helper text
- 🔍 Icon support (left and right)
- ✅ Built-in error handling
- ♿ Fully accessible with proper ARIA attributes
- 🎭 Disabled state support
- 📱 Full width option
- 🔄 Forward ref support

## Usage

### Basic Input

```tsx
import { Input } from '@/design-system/components/Input';

function MyComponent() {
    const [value, setValue] = useState('');

    return <Input placeholder="Enter text..." value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

### With Label

```tsx
<Input label="Username" placeholder="Enter your username" value={value} onChange={(e) => setValue(e.target.value)} />
```

### Sizes

```tsx
<Input size="sm" placeholder="Small input" />
<Input size="md" placeholder="Medium input (default)" />
<Input size="lg" placeholder="Large input" />
```

### With Icons

```tsx
const SearchIcon = <svg>...</svg>;

<Input leftIcon={SearchIcon} placeholder="Search..." />
```

### Error State

```tsx
<Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} error="Please enter a valid email address" />
```

### Success State

```tsx
<Input label="Email" variant="success" value={email} onChange={(e) => setEmail(e.target.value)} helperText="Email is valid" />
```

### Disabled

```tsx
<Input disabled value="Cannot edit" />
```

### Full Width

```tsx
<Input fullWidth label="Full Width" placeholder="This input takes full width" />
```

### Password Input with Toggle

```tsx
const [password, setPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);

<Input
    label="Password"
    type={showPassword ? 'text' : 'password'}
    placeholder="Enter password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    rightIcon={<EyeIcon onClick={() => setShowPassword(!showPassword)} />}
/>;
```

## Props

| Prop         | Type                             | Default     | Description                                |
| ------------ | -------------------------------- | ----------- | ------------------------------------------ |
| size         | 'sm' \| 'md' \| 'lg'             | 'md'        | Input size                                 |
| variant      | 'default' \| 'error' \| 'success'| 'default'   | Input variant                              |
| error        | string                           | -           | Error message (overrides variant to error) |
| label        | string                           | -           | Label text                                 |
| helperText   | string                           | -           | Helper text below input                    |
| fullWidth    | boolean                          | false       | Whether input takes full width             |
| leftIcon     | React.ReactNode                  | -           | Icon to display on the left                |
| rightIcon    | React.ReactNode                  | -           | Icon to display on the right               |
| disabled     | boolean                          | false       | Whether input is disabled                  |
| className    | string                           | -           | Additional CSS classes                     |
| ...props     | InputHTMLAttributes              | -           | All standard input HTML attributes         |

## Accessibility

- Automatically generates unique IDs for proper label association
- Supports all standard input ARIA attributes
- Disabled state properly communicated to screen readers
- Error messages linked to input via aria-describedby (when implemented)

## Styling

The component uses CSS modules and design tokens. You can customize by:

1. Using the `className` prop to add custom styles
2. Using the `style` prop for inline styles
3. Overriding CSS module classes in your own stylesheets

## Examples

See [example.tsx](./example.tsx) for comprehensive examples of all features.
