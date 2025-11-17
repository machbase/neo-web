# List Component

A simple, customizable list component for displaying scrollable items with selection support.

## Features

- Scrollable list with custom scrollbar styling
- Item selection with click handling
- Empty state support
- Loading state support
- Tooltip support for items
- Customizable styling and height
- Forward ref support

## Usage

```tsx
import List from '@/design-system/components/List';

const [items, setItems] = useState<ListItem[]>([
    { id: 1, label: 'Item 1', tooltip: 'This is item 1' },
    { id: 2, label: 'Item 2', tooltip: 'This is item 2' },
    { id: 3, label: 'Item 3', tooltip: 'This is item 3' },
]);

<List
    items={items}
    onItemClick={(itemId) => {
        console.log('Selected item:', itemId);
    }}
    emptyMessage="No items available"
    maxHeight={300}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `ListItem[]` | - | Array of items to display (required) |
| `onItemClick` | `(itemId: string \| number) => void` | - | Callback when an item is clicked (required) |
| `isLoading` | `boolean` | `false` | Show loading state |
| `emptyMessage` | `React.ReactNode` | `'no-data'` | Message to show when list is empty |
| `className` | `string` | - | Additional CSS classes |
| `style` | `React.CSSProperties` | - | Inline styles |
| `maxHeight` | `string \| number` | `'100%'` | Maximum height of the list (string like '300px' or number in px) |

## ListItem Interface

```typescript
interface ListItem {
    id: string | number;           // Unique identifier
    label: React.ReactNode;        // Display text or node
    tooltip?: string;              // Optional tooltip on hover
}
```

## Example: Tag Selector Integration

```tsx
import List from '@/design-system/components/List';

const TagSelector = () => {
    const [sTagList, setTagList] = useState<string[]>([]);
    const [sSelectedTag, setSelectedTag] = useState<string | null>(null);

    const tagListItems = sTagList.map((tag) => ({
        id: tag,
        label: tag,
        tooltip: tag,
    }));

    const handleTagSelect = (tagId: string | number) => {
        setSelectedTag(tagId as string);
        // Call parent callback with selected tag
        pCallback(tagId as string);
    };

    return (
        <List
            items={tagListItems}
            onItemClick={handleTagSelect}
            emptyMessage="No tags found"
            maxHeight={256}
        />
    );
};
```

## Styling

The component uses CSS modules and design system tokens:

- **Border Radius**: 8px (container), 4px (items)
- **Colors**:
  - Background: `rgba(38, 40, 49, 0.5)`
  - Border: `rgba(255, 255, 255, 0.2)`
  - Text: `white`
  - Hover: `rgba(255, 255, 255, 0.1)`
- **Scrollbar**: Custom styled with 6px width
- **Transition**: 0.2s ease for hover effects

## Accessibility

- Items are rendered as buttons for proper keyboard navigation
- Supports title attribute for tooltips
- Disabled state management
- Semantic HTML structure

## Ref Support

The component supports forwarding refs to access the container DOM element:

```tsx
const listRef = useRef<HTMLDivElement>(null);

<List
    ref={listRef}
    items={items}
    onItemClick={handleClick}
/>
```
