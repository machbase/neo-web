import { useState, useCallback } from 'react';

export interface GNBItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
}

export interface UseGNBProps {
    items?: GNBItem[];
    selectedId?: string;
    onSelect?: (item: GNBItem) => void;
}

export interface UseGNBReturn {
    items: GNBItem[];
    selectedId: string | null;
    isItemSelected: (itemId: string) => boolean;
    handleItemClick: (item: GNBItem) => void;
    setSelectedId: (id: string | null) => void;
}

/**
 * Headless hook for managing GNB (Global Navigation Bar) state and interactions
 *
 * @param items - Array of navigation items to display
 * @param selectedId - Currently selected item ID (controlled mode)
 * @param onSelect - Callback fired when an item is selected
 *
 * @returns Object containing state and handlers for GNB functionality
 *
 * @example
 * ```tsx
 * const { items, selectedId, handleItemClick } = useGNB({
 *   items: navItems,
 *   onSelect: (item) => console.log('Selected:', item)
 * });
 * ```
 */
export const useGNB = ({ items = [], selectedId: controlledSelectedId, onSelect }: UseGNBProps = {}): UseGNBReturn => {
    const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);

    // Use controlled value if provided, otherwise use internal state
    const selectedId = controlledSelectedId !== undefined ? controlledSelectedId : internalSelectedId;

    const isItemSelected = useCallback(
        (itemId: string): boolean => {
            return selectedId === itemId;
        },
        [selectedId]
    );

    const handleItemClick = useCallback(
        (item: GNBItem) => {
            // If clicking the same item, deselect it
            if (selectedId === item.id) {
                setInternalSelectedId(null);
                if (onSelect) {
                    onSelect({ ...item, id: '' });
                }
            } else {
                setInternalSelectedId(item.id);
                if (onSelect) {
                    onSelect(item);
                }
            }
        },
        [selectedId, onSelect]
    );

    return {
        items,
        selectedId,
        isItemSelected,
        handleItemClick,
        setSelectedId: setInternalSelectedId,
    };
};
