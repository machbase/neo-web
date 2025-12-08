# HierarchicalCombobox Component

A Grafana-style hierarchical combobox component. Provides a searchable input field and a 2-column layout with categories on the left and items on the right.

## Basic Usage

```tsx
import { HierarchicalCombobox } from '@/design-system/components/HierarchicalCombobox';
import { UNITS } from '@/utils/Chart/AxisConstants';

export function UnitSelector() {
    return (
        <HierarchicalCombobox.Root
            label="Unit"
            placeholder="Search unit..."
            onChange={(value, label) => {
                console.log('Selected:', value, label);
            }}
        >
            <HierarchicalCombobox.Input />
            <HierarchicalCombobox.Menu>
                <HierarchicalCombobox.List categories={UNITS} />
            </HierarchicalCombobox.Menu>
        </HierarchicalCombobox.Root>
    );
}
```

## Props

### HierarchicalCombobox.Root

| Prop | Type | Default | Description |
|------|------|---------|------|
| `value` | `string` | - | Selected value |
| `onChange` | `(value: string, label: string) => void` | - | Callback when value changes |
| `placeholder` | `string` | `'Select an option'` | Placeholder text |
| `label` | `string` | - | Label text |
| `labelPosition` | `'top' \| 'left'` | `'top'` | Label position |
| `fullWidth` | `boolean` | `false` | Use full width |
| `className` | `string` | - | Custom class |
| `children` | `ReactNode` | - | Child elements (Input, Menu) |

### HierarchicalCombobox.Input

| Prop | Type | Description |
|------|------|------|
| `className` | `string` | Custom class |

**Features:**
- Searchable input field
- Dropdown opens automatically on input
- Displays selected label after selection

### HierarchicalCombobox.Menu

| Prop | Type | Description |
|------|------|------|
| `className` | `string` | Custom class |
| `children` | `ReactNode` | Child elements (List) |

### HierarchicalCombobox.List

| Prop | Type | Description |
|------|------|------|
| `categories` | `HierarchicalComboboxCategory[]` | Array of categories |
| `className` | `string` | Custom class |
| `emptyMessage` | `string` | Empty state message |

## Data Structure

```typescript
interface HierarchicalComboboxCategory {
    id: string;
    label: string;
    items?: HierarchicalComboboxItem[];
}

interface HierarchicalComboboxItem {
    id: string;
    label: string;
}
```

## Using with AxisConstants.ts

Directly compatible with the `UNITS` array from `AxisConstants.ts`:

```tsx
import { HierarchicalCombobox } from '@/design-system/components/HierarchicalCombobox';
import { UNITS } from '@/utils/Chart/AxisConstants';

function ChartAxisUnitDropdown() {
    const [selectedUnit, setSelectedUnit] = useState<string>();

    return (
        <HierarchicalCombobox.Root
            label="Axis Unit"
            placeholder="Search units..."
            value={selectedUnit}
            onChange={(value) => {
                setSelectedUnit(value);
            }}
        >
            <HierarchicalCombobox.Input />
            <HierarchicalCombobox.Menu>
                <HierarchicalCombobox.List categories={UNITS} />
            </HierarchicalCombobox.Menu>
        </HierarchicalCombobox.Root>
    );
}
```

## How It Works

1. **Search**: When text is entered in the Input field, both categories and items are filtered
2. **Category Selection**: Clicking a category on the left displays corresponding items on the right
3. **Menu Persistence**: The menu stays open when clicking categories (closes only after selection)
4. **Item Selection**: Clicking an item on the right selects it and closes the menu

## Styling

Automatically uses design system tokens through SCSS variables:
- Background color: `t.$dropdown-bg`
- Text color: `t.$text-primary`, `t.$text-secondary`
- Animation: Fade-in + slide-down
- Responsive layout support

## Features

- ✅ **True Combobox** - Searchable via input
- ✅ **2-Column Layout** - Categories on left / Items on right
- ✅ **Search Filtering** - Filter by category and item names
- ✅ **Checkmark** on selected items
- ✅ **Menu Persistence** - Menu stays open when clicking categories
- ✅ **Portal Rendering** - Displays above other elements
- ✅ **Auto-close** on outside click
- ✅ Direct compatibility with `UNITS` array from `AxisConstants.ts`
