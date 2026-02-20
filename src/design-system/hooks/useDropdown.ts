import { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react';

export interface DropdownOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface UseDropdownProps {
    options: DropdownOption[];
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    onOpenChange?: (isOpen: boolean) => void;
    disabled?: boolean;
    placeholder?: string;
}

export interface UseDropdownReturn {
    // State
    isOpen: boolean;
    selectedValue: string | undefined;
    selectedOption: DropdownOption | undefined;
    focusedIndex: number;
    options: DropdownOption[];
    disabled: boolean;
    placeholder: string;

    // Refs
    containerRef: React.RefObject<HTMLDivElement>;
    triggerRef: React.RefObject<HTMLButtonElement>;
    listRef: React.RefObject<HTMLUListElement>;

    // Actions
    setIsOpen: (isOpen: boolean) => void;
    handleToggle: () => void;
    handleSelect: (value: string) => void;
    handleClear: () => void;

    // Props getters
    getDropdownProps: () => {
        ref: React.RefObject<HTMLDivElement>;
    };
    getTriggerProps: () => {
        ref: React.RefObject<HTMLButtonElement>;
        onClick: () => void;
        onKeyDown: (e: KeyboardEvent) => void;
        disabled: boolean;
        'aria-haspopup': 'listbox';
        'aria-expanded': boolean;
    };
    getListProps: () => {
        ref: React.RefObject<HTMLUListElement>;
        role: 'listbox';
    };
    getOptionProps: (
        option: DropdownOption,
        index: number
    ) => {
        role: 'option';
        onClick: () => void;
        onMouseEnter: () => void;
        'aria-selected': boolean;
        'aria-disabled': boolean;
        'data-focused': boolean;
    };
}

export const useDropdown = (props: UseDropdownProps): UseDropdownReturn => {
    const { options, value, defaultValue, onChange, onOpenChange, disabled = false, placeholder = 'Select an option' } = props;

    // State
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState<string | undefined>(value ?? defaultValue);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Notify on open change
    useEffect(() => {
        onOpenChange?.(isOpen);
    }, [isOpen, onOpenChange]);

    // Sync external value prop with internal state
    useEffect(() => {
        if (value !== undefined) {
            setSelectedValue(value);
        }
    }, [value]);

    // Derived state
    const selectedOption = options.find((opt) => opt.value === selectedValue);

    // Handle toggle
    const handleToggle = useCallback(() => {
        if (disabled) return;
        setIsOpen((prev) => {
            const newIsOpen = !prev;
            if (newIsOpen) {
                // Reset focus when opening
                const currentIndex = options.findIndex((opt) => opt.value === selectedValue);
                setFocusedIndex(currentIndex);
            }
            return newIsOpen;
        });
    }, [disabled, options, selectedValue]);

    // Handle select
    const handleSelect = useCallback(
        (newValue: string) => {
            setSelectedValue(newValue);
            setIsOpen(false);
            onChange?.(newValue);
            triggerRef.current?.focus();
        },
        [onChange]
    );

    // Handle clear
    const handleClear = useCallback(() => {
        setSelectedValue(undefined);
        onChange?.('');
    }, [onChange]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (disabled) return;

            switch (e.key) {
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (!isOpen) {
                        setIsOpen(true);
                    } else if (focusedIndex >= 0 && !options[focusedIndex].disabled) {
                        handleSelect(options[focusedIndex].value);
                    }
                    break;

                case 'Escape':
                    e.preventDefault();
                    setIsOpen(false);
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    if (!isOpen) {
                        setIsOpen(true);
                    } else {
                        setFocusedIndex((prev) => {
                            let next = prev + 1;
                            // Skip disabled options
                            while (next < options.length && options[next].disabled) {
                                next++;
                            }
                            return next < options.length ? next : prev;
                        });
                    }
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    if (isOpen) {
                        setFocusedIndex((prev) => {
                            let next = prev - 1;
                            // Skip disabled options
                            while (next >= 0 && options[next].disabled) {
                                next--;
                            }
                            return next >= 0 ? next : prev;
                        });
                    }
                    break;

                case 'Home':
                    if (isOpen) {
                        e.preventDefault();
                        setFocusedIndex(0);
                    }
                    break;

                case 'End':
                    if (isOpen) {
                        e.preventDefault();
                        setFocusedIndex(options.length - 1);
                    }
                    break;
            }
        },
        [disabled, isOpen, focusedIndex, options, handleSelect]
    );

    // Props getters
    const getDropdownProps = useCallback(
        () => ({
            ref: containerRef,
        }),
        []
    );

    const getTriggerProps = useCallback(
        () => ({
            ref: triggerRef,
            onClick: handleToggle,
            onKeyDown: handleKeyDown,
            disabled,
            'aria-haspopup': 'listbox' as const,
            'aria-expanded': isOpen,
        }),
        [handleToggle, handleKeyDown, disabled, isOpen]
    );

    const getListProps = useCallback(
        () => ({
            ref: listRef,
            role: 'listbox' as const,
        }),
        []
    );

    const getOptionProps = useCallback(
        (option: DropdownOption, index: number) => ({
            role: 'option' as const,
            onClick: () => {
                if (!option.disabled) {
                    handleSelect(option.value);
                }
            },
            onMouseEnter: () => {
                if (!option.disabled) {
                    setFocusedIndex(index);
                }
            },
            'aria-selected': selectedValue === option.value,
            'aria-disabled': option.disabled ?? false,
            'data-focused': focusedIndex === index,
        }),
        [handleSelect, selectedValue, focusedIndex]
    );

    return {
        // State
        isOpen,
        selectedValue,
        selectedOption,
        focusedIndex,
        options,
        disabled,
        placeholder,

        // Refs
        containerRef,
        triggerRef,
        listRef,

        // Actions
        setIsOpen,
        handleToggle,
        handleSelect,
        handleClear,

        // Props getters
        getDropdownProps,
        getTriggerProps,
        getListProps,
        getOptionProps,
    };
};
