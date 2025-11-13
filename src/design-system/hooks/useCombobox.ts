import { useState, useRef, useCallback, useMemo, KeyboardEvent, ChangeEvent } from 'react';

export interface ComboboxOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface UseComboboxProps {
    options: ComboboxOption[];
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    onSearch?: (query: string) => void;
    placeholder?: string;
    disabled?: boolean;
    searchable?: boolean;
    clearable?: boolean;
}

export interface UseComboboxReturn {
    // State
    isOpen: boolean;
    selectedValue: string;
    searchQuery: string;
    focusedIndex: number;
    filteredOptions: ComboboxOption[];

    // Refs
    inputRef: React.RefObject<HTMLInputElement>;
    listRef: React.RefObject<HTMLUListElement>;
    containerRef: React.RefObject<HTMLDivElement>;

    // Handlers
    handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
    handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
    handleOptionClick: (value: string) => void;
    handleToggle: () => void;
    handleClear: () => void;
    setIsOpen: (open: boolean) => void;

    // Props getters
    getComboboxProps: () => {
        ref: React.RefObject<HTMLDivElement>;
        className?: string;
    };
    getInputProps: () => {
        ref: React.RefObject<HTMLInputElement>;
        role: string;
        'aria-expanded': boolean;
        'aria-controls': string;
        'aria-activedescendant': string;
        'aria-autocomplete': 'list' | 'none';
        value: string;
        placeholder?: string;
        disabled?: boolean;
        onChange: (e: ChangeEvent<HTMLInputElement>) => void;
        onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
        onFocus: () => void;
    };
    getTriggerProps: () => {
        onClick: () => void;
        'aria-label': string;
        disabled?: boolean;
    };
    getListProps: () => {
        ref: React.RefObject<HTMLUListElement>;
        role: string;
        id: string;
        'aria-labelledby'?: string;
    };
    getOptionProps: (option: ComboboxOption, index: number) => {
        id: string;
        role: string;
        'aria-selected': boolean;
        'aria-disabled': boolean;
        onClick: (e: React.MouseEvent) => void;
        onMouseEnter: () => void;
        'data-focused': boolean;
    };

    // Computed
    selectedOption: ComboboxOption | undefined;
    displayValue: string;
}

export const useCombobox = ({
    options,
    value,
    defaultValue = '',
    onChange,
    onSearch,
    placeholder = 'Select an option',
    disabled = false,
    searchable = true,
}: UseComboboxProps): UseComboboxReturn => {
    // State
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(value ?? defaultValue);
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);

    // Refs
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync external value changes
    if (value !== undefined && value !== selectedValue) {
        setSelectedValue(value);
    }

    // Filter options based on search query
    const filteredOptions = useMemo(() => {
        if (!searchable || !searchQuery) {
            return options;
        }

        const query = searchQuery.toLowerCase();
        return options.filter((option) => option.label.toLowerCase().includes(query));
    }, [options, searchQuery, searchable]);

    // Get selected option
    const selectedOption = useMemo(() => {
        return options.find((option) => option.value === selectedValue);
    }, [options, selectedValue]);

    // Display value in input
    const displayValue = useMemo(() => {
        if (isOpen && searchable) {
            return searchQuery;
        }
        return selectedOption?.label ?? '';
    }, [isOpen, searchable, searchQuery, selectedOption]);

    // Handle input change (search)
    const handleInputChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const query = e.target.value;
            setSearchQuery(query);
            setFocusedIndex(-1);

            if (!isOpen) {
                setIsOpen(true);
            }

            onSearch?.(query);
        },
        [isOpen, onSearch]
    );

    // Handle option selection
    const handleOptionClick = useCallback(
        (optionValue: string) => {
            setSelectedValue(optionValue);
            setSearchQuery('');
            setIsOpen(false);
            setFocusedIndex(-1);
            justClosed.current = true;

            onChange?.(optionValue);

            // Return focus to input
            setTimeout(() => {
                inputRef.current?.focus();
            }, 0);
        },
        [onChange]
    );

    // Handle clear
    const handleClear = useCallback(() => {
        setSelectedValue('');
        setSearchQuery('');
        setFocusedIndex(-1);
        onChange?.('');
        inputRef.current?.focus();
    }, [onChange]);

    // Handle toggle
    const handleToggle = useCallback(() => {
        if (disabled) return;

        setIsOpen((prev) => {
            const newState = !prev;
            if (newState) {
                // Opening
                setSearchQuery('');
                setFocusedIndex(-1);
                inputRef.current?.focus();
            }
            return newState;
        });
    }, [disabled]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            if (disabled) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    isKeyboardNavigation.current = true;
                    if (!isOpen) {
                        setIsOpen(true);
                        setFocusedIndex(0);
                        keyboardNavigationStarted.current = true;
                    } else {
                        setFocusedIndex((prev) => {
                            // First keyboard navigation after mouse hover
                            if (!keyboardNavigationStarted.current) {
                                keyboardNavigationStarted.current = true;
                                return 0;
                            }
                            const next = prev + 1;
                            return next >= filteredOptions.length ? 0 : next;
                        });
                    }
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    isKeyboardNavigation.current = true;
                    if (!isOpen) {
                        setIsOpen(true);
                        setFocusedIndex(filteredOptions.length - 1);
                        keyboardNavigationStarted.current = true;
                    } else {
                        setFocusedIndex((prev) => {
                            // First keyboard navigation after mouse hover
                            if (!keyboardNavigationStarted.current) {
                                keyboardNavigationStarted.current = true;
                                return filteredOptions.length - 1;
                            }
                            const next = prev - 1;
                            return next < 0 ? filteredOptions.length - 1 : next;
                        });
                    }
                    break;

                case 'Enter':
                    e.preventDefault();
                    if (isOpen && focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
                        const option = filteredOptions[focusedIndex];
                        if (!option.disabled) {
                            handleOptionClick(option.value);
                        }
                    } else {
                        setIsOpen(true);
                    }
                    break;

                case 'Escape':
                    e.preventDefault();
                    setIsOpen(false);
                    setSearchQuery('');
                    setFocusedIndex(-1);
                    break;

                case 'Tab':
                    setIsOpen(false);
                    setSearchQuery('');
                    setFocusedIndex(-1);
                    break;

                case 'Home':
                    if (isOpen) {
                        e.preventDefault();
                        isKeyboardNavigation.current = true;
                        setFocusedIndex(0);
                    }
                    break;

                case 'End':
                    if (isOpen) {
                        e.preventDefault();
                        isKeyboardNavigation.current = true;
                        setFocusedIndex(filteredOptions.length - 1);
                    }
                    break;

                default:
                    break;
            }
        },
        [disabled, isOpen, focusedIndex, filteredOptions, handleOptionClick]
    );

    // Scroll focused option into view
    const scrollToOption = useCallback((index: number) => {
        if (listRef.current) {
            const option = listRef.current.children[index] as HTMLElement;
            option?.scrollIntoView({ block: 'nearest' });
        }
    }, []);

    // Track if navigation is via keyboard
    const isKeyboardNavigation = useRef(false);

    // Track if keyboard navigation has started (to ignore mouse hover)
    const keyboardNavigationStarted = useRef(false);

    // Track if we just closed the dropdown (to prevent reopening on focus)
    const justClosed = useRef(false);

    // Auto-scroll when focused index changes (only for keyboard navigation)
    if (focusedIndex >= 0 && isKeyboardNavigation.current) {
        scrollToOption(focusedIndex);
        isKeyboardNavigation.current = false;
    }

    // Props getters
    const getComboboxProps = useCallback(() => {
        return {
            ref: containerRef,
        };
    }, []);

    const getInputProps = useCallback(() => {
        return {
            ref: inputRef,
            role: 'combobox' as const,
            'aria-expanded': isOpen,
            'aria-controls': 'combobox-listbox',
            'aria-activedescendant': focusedIndex >= 0 ? `combobox-option-${focusedIndex}` : '',
            'aria-autocomplete': (searchable ? 'list' : 'none') as 'list' | 'none',
            value: displayValue,
            placeholder,
            disabled,
            onChange: handleInputChange,
            onKeyDown: handleKeyDown,
            onFocus: () => {
                if (searchable && !justClosed.current) {
                    setIsOpen(true);
                }
                justClosed.current = false;
            },
        };
    }, [isOpen, focusedIndex, searchable, displayValue, placeholder, disabled, handleInputChange, handleKeyDown]);

    const getTriggerProps = useCallback(() => {
        return {
            onClick: handleToggle,
            'aria-label': isOpen ? 'Close dropdown' : 'Open dropdown',
            disabled,
        };
    }, [handleToggle, isOpen, disabled]);

    const getListProps = useCallback(() => {
        return {
            ref: listRef,
            role: 'listbox' as const,
            id: 'combobox-listbox',
        };
    }, []);

    const getOptionProps = useCallback(
        (option: ComboboxOption, index: number) => {
            return {
                id: `combobox-option-${index}`,
                role: 'option' as const,
                'aria-selected': option.value === selectedValue,
                'aria-disabled': option.disabled ?? false,
                onClick: (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (!option.disabled) {
                        handleOptionClick(option.value);
                    }
                },
                onMouseEnter: () => {
                    keyboardNavigationStarted.current = false;
                    setFocusedIndex(index);
                },
                'data-focused': index === focusedIndex,
            };
        },
        [selectedValue, focusedIndex, handleOptionClick]
    );

    return {
        // State
        isOpen,
        selectedValue,
        searchQuery,
        focusedIndex,
        filteredOptions,

        // Refs
        inputRef,
        listRef,
        containerRef,

        // Handlers
        handleInputChange,
        handleKeyDown,
        handleOptionClick,
        handleToggle,
        handleClear,
        setIsOpen,

        // Props getters
        getComboboxProps,
        getInputProps,
        getTriggerProps,
        getListProps,
        getOptionProps,

        // Computed
        selectedOption,
        displayValue,
    };
};
