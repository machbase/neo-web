# Pagination Component

A flexible pagination component for navigating through pages of data.

## Features

- First, Previous, Next, and Last page navigation buttons
- Current page input field for direct page navigation
- Disabled states for boundary pages
- Keyboard support (Enter to navigate)
- Full accessibility support (ARIA labels)
- Customizable styling

## Usage

```tsx
import Pagination from '@/design-system/components/Pagination';

const [currentPage, setCurrentPage] = useState(1);
const [inputValue, setInputValue] = useState('1');
const totalPages = 10;

<Pagination
    currentPage={currentPage}
    totalPages={totalPages}
    onPageChange={(page) => {
        setCurrentPage(page);
        setInputValue(page.toString());
    }}
    onPageInputChange={(value) => setInputValue(value)}
    onPageInputApply={(event) => {
        // Handle page input validation and apply
        if (event === 'outsideClick') {
            // Handle outside click
        } else if (event.key === 'Enter') {
            // Handle Enter key
            const page = Number(inputValue);
            if (page > 0 && page <= totalPages) {
                setCurrentPage(page);
            }
        }
    }}
    inputValue={inputValue}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currentPage` | `number` | - | Current page number (required) |
| `totalPages` | `number` | - | Total number of pages (required) |
| `onPageChange` | `(page: number) => void` | - | Callback when page changes (required) |
| `onPageInputChange` | `(value: string) => void` | - | Callback when input value changes |
| `onPageInputApply` | `(event: KeyboardEvent \| string) => void` | - | Callback when applying page input (Enter key or outside click) |
| `className` | `string` | - | Additional CSS classes |
| `style` | `React.CSSProperties` | - | Inline styles |
| `inputValue` | `string` | `currentPage.toString()` | Current input field value |
| `showInputControl` | `boolean` | `true` | Show/hide page number input field |

## Accessibility

- All buttons have appropriate ARIA labels
- Keyboard navigation support (Enter to apply input)
- Disabled states clearly indicated
- Focus management for input field

## Example: Tag Selector Integration

```tsx
import Pagination from '@/design-system/components/Pagination';

const TagSelector = () => {
    const [sTagPagination, setTagPagination] = useState(1);
    const [sKeepPageNum, setKeepPageNum] = useState('1');
    const getMaxPageNum = Math.ceil(sTagTotal / 10);

    const handlePaginationInput = (aEvent: any) => {
        setKeepPageNum(aEvent.target.value);
    };

    const handleApplyPagenationInput = (aEvent: any) => {
        if (sKeepPageNum === sTagPagination) return;
        if (aEvent.keyCode === 13 || aEvent === 'outsideClick') {
            if (!Number(sKeepPageNum)) {
                setKeepPageNum('1');
                setTagPagination(1);
                return;
            }
            if (getMaxPageNum < Number(sKeepPageNum)) {
                setKeepPageNum(getMaxPageNum.toString());
                setTagPagination(getMaxPageNum);
                return;
            }
            setTagPagination(Number(sKeepPageNum));
        }
    };

    return (
        <Pagination
            currentPage={sTagPagination}
            totalPages={getMaxPageNum}
            onPageChange={(page) => {
                setTagPagination(page);
                setKeepPageNum(page.toString());
            }}
            onPageInputChange={handlePaginationInput}
            onPageInputApply={handleApplyPagenationInput}
            inputValue={sKeepPageNum}
        />
    );
};
```
