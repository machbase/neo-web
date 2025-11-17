# Modal Component

A flexible and accessible modal dialog component built with headless architecture and compound component pattern.

## Features

- **Headless Architecture**: Separates logic from presentation for maximum flexibility
- **Compound Components**: Composable API for flexible layouts
- **Accessibility**: Full ARIA support and keyboard navigation
- **Portal Rendering**: Renders to document.body to avoid z-index issues
- **Customizable**: Supports custom styling via className and style props
- **Loading States**: Built-in loading indicator for async operations
- **Focus Management**: Locks body scroll when modal is open
- **Close Options**: Configurable close behavior (Escape key, outside click)

## Installation

```typescript
import { Modal } from '@/design-system/components/Modal';
```

## Basic Usage

```tsx
import { useState } from 'react';
import { Modal } from '@/design-system/components/Modal';

function Example() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button onClick={() => setIsOpen(true)}>Open Modal</button>

            <Modal.Root isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <Modal.Header>
                    <Modal.Title>Modal Title</Modal.Title>
                    <Modal.Close />
                </Modal.Header>
                <Modal.Body>
                    <p>Modal content goes here</p>
                </Modal.Body>
                <Modal.Footer>
                    <Modal.Cancel />
                    <Modal.Confirm onClick={() => setIsOpen(false)}>Save</Modal.Confirm>
                </Modal.Footer>
            </Modal.Root>
        </>
    );
}
```

## Components

### Modal.Root

Main container component that manages modal state and behavior.

**Props:**
- `isOpen` (boolean, required): Controls modal visibility
- `onClose` (() => void, required): Callback when modal should close
- `closeOnEscape` (boolean, optional): Close on Escape key press (default: true)
- `closeOnOutsideClick` (boolean, optional): Close when clicking outside (default: true)
- `className` (string, optional): Additional CSS classes
- `children` (ReactNode, required): Modal content

**Example:**
```tsx
<Modal.Root
    isOpen={isOpen}
    onClose={() => setIsOpen(false)}
    closeOnEscape={true}
    closeOnOutsideClick={true}
>
    {/* Modal content */}
</Modal.Root>
```

### Modal.Header

Header section containing title and close button.

**Props:**
- `children` (ReactNode, required): Header content
- `className` (string, optional): Additional CSS classes

**Example:**
```tsx
<Modal.Header>
    <Modal.Title>Add Model</Modal.Title>
    <Modal.Close />
</Modal.Header>
```

### Modal.Title

Title text component.

**Props:**
- `children` (ReactNode, required): Title text
- `className` (string, optional): Additional CSS classes

**Example:**
```tsx
<Modal.Title>Modal Title</Modal.Title>
```

### Modal.Body

Main content area with scrollable overflow.

**Props:**
- `children` (ReactNode, required): Body content
- `className` (string, optional): Additional CSS classes

**Example:**
```tsx
<Modal.Body>
    <p>Your content here</p>
</Modal.Body>
```

### Modal.Footer

Footer section for action buttons.

**Props:**
- `children` (ReactNode, required): Footer content (typically buttons)
- `className` (string, optional): Additional CSS classes

**Example:**
```tsx
<Modal.Footer>
    <Modal.Cancel />
    <Modal.Confirm onClick={handleSave}>Save</Modal.Confirm>
</Modal.Footer>
```

### Modal.Close

Close button (X icon) that triggers onClose callback.

**Props:**
- `children` (ReactNode, optional): Custom close icon/text (default: X icon)
- `className` (string, optional): Additional CSS classes

**Example:**
```tsx
<Modal.Close />
<!-- or with custom content -->
<Modal.Close>Close</Modal.Close>
```

### Modal.Confirm

Primary action button (typically "Save", "Confirm", etc.)

**Props:**
- `children` (ReactNode, optional): Button text (default: "Confirm")
- `className` (string, optional): Additional CSS classes
- `onClick` (() => void, optional): Click handler
- `disabled` (boolean, optional): Disable button
- `loading` (boolean, optional): Show loading spinner

**Example:**
```tsx
<Modal.Confirm onClick={handleSave}>
    Save Changes
</Modal.Confirm>

<!-- With loading state -->
<Modal.Confirm onClick={handleSave} loading={isSaving}>
    Save
</Modal.Confirm>
```

### Modal.Cancel

Secondary action button that closes the modal.

**Props:**
- `children` (ReactNode, optional): Button text (default: "Cancel")
- `className` (string, optional): Additional CSS classes
- `onClick` (() => void, optional): Custom click handler (default: closes modal)

**Example:**
```tsx
<Modal.Cancel />
<!-- or with custom text -->
<Modal.Cancel>No, Go Back</Modal.Cancel>
```

## Examples

### Confirmation Dialog

```tsx
function DeleteConfirmation() {
    const [isOpen, setIsOpen] = useState(false);

    const handleDelete = () => {
        // Delete logic
        setIsOpen(false);
    };

    return (
        <Modal.Root isOpen={isOpen} onClose={() => setIsOpen(false)}>
            <Modal.Header>
                <Modal.Title>Confirm Deletion</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <p>Are you sure you want to delete this item?</p>
                <p>This action cannot be undone.</p>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Cancel>No, Keep It</Modal.Cancel>
                <Modal.Confirm onClick={handleDelete}>Yes, Delete</Modal.Confirm>
            </Modal.Footer>
        </Modal.Root>
    );
}
```

### Form Modal with Loading

```tsx
function AddUserModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');

    const handleSubmit = async () => {
        setLoading(true);
        await saveUser(name);
        setLoading(false);
        setIsOpen(false);
    };

    return (
        <Modal.Root
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            closeOnEscape={!loading}
            closeOnOutsideClick={!loading}
        >
            <Modal.Header>
                <Modal.Title>Add User</Modal.Title>
                {!loading && <Modal.Close />}
            </Modal.Header>
            <Modal.Body>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                />
            </Modal.Body>
            <Modal.Footer>
                <Modal.Cancel onClick={() => setIsOpen(false)}>
                    Cancel
                </Modal.Cancel>
                <Modal.Confirm
                    onClick={handleSubmit}
                    disabled={!name}
                    loading={loading}
                >
                    Save
                </Modal.Confirm>
            </Modal.Footer>
        </Modal.Root>
    );
}
```

### Simple Alert

```tsx
function SuccessAlert() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Modal.Root isOpen={isOpen} onClose={() => setIsOpen(false)}>
            <Modal.Header>
                <Modal.Title>Success!</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <p>Your changes have been saved successfully.</p>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm onClick={() => setIsOpen(false)}>
                    OK
                </Modal.Confirm>
            </Modal.Footer>
        </Modal.Root>
    );
}
```

### Custom Styling

```tsx
<Modal.Root isOpen={isOpen} onClose={() => setIsOpen(false)}>
    <Modal.Header className="custom-header" style={{ backgroundColor: '#1a1a1a' }}>
        <Modal.Title>Custom Modal</Modal.Title>
        <Modal.Close />
    </Modal.Header>
    <Modal.Body style={{ padding: '32px' }}>
        <p>Custom styled content</p>
    </Modal.Body>
    <Modal.Footer>
        <Modal.Cancel style={{ minWidth: '100px' }}>Cancel</Modal.Cancel>
        <Modal.Confirm onClick={() => setIsOpen(false)} style={{ minWidth: '100px' }}>
            Confirm
        </Modal.Confirm>
    </Modal.Footer>
</Modal.Root>
```

### Prevent Closing

```tsx
<Modal.Root
    isOpen={isOpen}
    onClose={() => setIsOpen(false)}
    closeOnEscape={false}
    closeOnOutsideClick={false}
>
    <Modal.Header>
        <Modal.Title>Important Action Required</Modal.Title>
        {/* No close button */}
    </Modal.Header>
    <Modal.Body>
        <p>You must choose one of the options below.</p>
    </Modal.Body>
    <Modal.Footer>
        <Modal.Cancel>Decline</Modal.Cancel>
        <Modal.Confirm onClick={() => setIsOpen(false)}>Accept</Modal.Confirm>
    </Modal.Footer>
</Modal.Root>
```

## Styling

The modal uses design tokens from `@/design-system/tokens` for consistent styling:

- Background: `#2a2a2a`
- Border: `1px solid #3e3e3e`
- Width: `480px` (max-width: 90vw)
- Confirm button: Blue (`rgb(0, 108, 210)`)
- Cancel button: Transparent with border

### Custom Styles

You can customize any component by passing `className` or `style` props:

```tsx
<Modal.Root className="my-modal">
    <Modal.Header className="my-header" style={{ padding: '24px' }}>
        {/* ... */}
    </Modal.Header>
</Modal.Root>
```

## Accessibility

- **ARIA**: Uses `role="dialog"` and `aria-modal="true"`
- **Keyboard**: Escape key closes modal (configurable)
- **Focus Management**: Locks body scroll when open
- **Screen Readers**: Close button has `aria-label="Close modal"`

## Behavior

### Auto-close

- **Escape Key**: Closes modal (disable with `closeOnEscape={false}`)
- **Outside Click**: Closes modal (disable with `closeOnOutsideClick={false}`)
- **Close Button**: Always closes modal
- **Cancel Button**: Closes modal by default (override with custom `onClick`)

### Loading State

When `loading={true}` on `Modal.Confirm`:
- Button shows spinner
- Button is disabled
- Recommended to also disable close options during loading

```tsx
<Modal.Root
    closeOnEscape={!loading}
    closeOnOutsideClick={!loading}
>
    {/* ... */}
    <Modal.Confirm loading={loading}>Save</Modal.Confirm>
</Modal.Root>
```

## TypeScript

All components are fully typed with exported TypeScript interfaces:

```typescript
import {
    Modal,
    type ModalRootProps,
    type ModalHeaderProps,
    type ModalConfirmProps,
    // ... etc
} from '@/design-system/components/Modal';
```
