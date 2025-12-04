import React, { createContext, useContext, ReactNode, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MdOutlineChevronRight, MdExpandMore } from 'react-icons/md';
import { IoBackspaceOutline } from 'react-icons/io5';
import { FaCheck } from 'react-icons/fa';
import { Button } from '../Button';
import styles from './index.module.scss';

// Types
export interface HierarchicalComboboxItem {
    id: string;
    label: string;
}

export interface HierarchicalComboboxCategory {
    id: string;
    label: string;
    items?: HierarchicalComboboxItem[];
}

interface HierarchicalComboboxContextValue {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    selectedValue: string | undefined;
    selectedLabel: string | undefined;
    containerRef: React.RefObject<HTMLDivElement>;
    inputRef: React.RefObject<HTMLInputElement>;
    menuRef: React.RefObject<HTMLDivElement>;
    handleSelect: (value: string, label: string) => void;
    placeholder?: string;
    selectedCategory: string | null;
    setSelectedCategory: (categoryId: string | null) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    categories: HierarchicalComboboxCategory[];
}

const HierarchicalComboboxContext = createContext<HierarchicalComboboxContextValue | null>(null);

const useHierarchicalComboboxContext = () => {
    const context = useContext(HierarchicalComboboxContext);
    if (!context) {
        throw new Error('HierarchicalCombobox compound components must be used within HierarchicalCombobox.Root');
    }
    return context;
};

// Root Component
interface HierarchicalComboboxRootProps {
    children: ReactNode;
    value?: string;
    onChange?: (value: string, label: string) => void;
    placeholder?: string;
    className?: string;
    label?: string;
    labelPosition?: 'top' | 'left';
    fullWidth?: boolean;
    categories?: HierarchicalComboboxCategory[];
}

const HierarchicalComboboxRoot = ({
    children,
    value,
    onChange,
    placeholder = 'Select an option',
    className,
    label,
    labelPosition = 'top',
    fullWidth = false,
    categories = [],
}: HierarchicalComboboxRootProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState<string | undefined>(value);
    const [selectedLabel, setSelectedLabel] = useState<string | undefined>();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Initialize selected label and category from value
    useEffect(() => {
        if (value && categories.length > 0) {
            for (const category of categories) {
                const item = category.items?.find((item) => item.id === value);
                if (item) {
                    setSelectedLabel(item.label);
                    setSelectedCategory(category.id);
                    break;
                }
            }
        }
    }, [value, categories]);

    // Handle outside clicks for both container and portal menu
    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            const target = event.target as Node;

            // Check if click is outside both container and menu
            if (containerRef.current && menuRef.current) {
                const isInsideContainer = containerRef.current.contains(target);
                const isInsideMenu = menuRef.current.contains(target);

                if (!isInsideContainer && !isInsideMenu && isOpen) {
                    setIsOpen(false);
                    setSearchQuery('');
                }
            }
        };

        if (isOpen) {
            // Use capture phase to ensure we catch all clicks
            document.addEventListener('click', handleDocumentClick, true);
            return () => {
                document.removeEventListener('click', handleDocumentClick, true);
            };
        }
    }, [isOpen]);

    const handleSelect = (newValue: string, newLabel: string) => {
        setSelectedValue(newValue);
        setSelectedLabel(newLabel);
        setIsOpen(false);
        setSearchQuery('');
        onChange?.(newValue, newLabel);
    };

    const comboboxId = `hierarchical-combobox-${Math.random().toString(36).substring(2, 9)}`;

    const containerClasses = [
        styles['hierarchical-combobox-container'],
        styles[`hierarchical-combobox-container--label-${labelPosition}`],
        fullWidth && styles['hierarchical-combobox-container--full-width'],
        className,
    ]
        .filter(Boolean)
        .join(' ');

    const labelElement = label && (
        <label htmlFor={comboboxId} className={styles['hierarchical-combobox-label']}>
            {label}
        </label>
    );

    return (
        <HierarchicalComboboxContext.Provider
            value={{
                isOpen,
                setIsOpen,
                selectedValue,
                selectedLabel,
                containerRef,
                inputRef,
                menuRef,
                handleSelect,
                placeholder,
                selectedCategory,
                setSelectedCategory,
                searchQuery,
                setSearchQuery,
                categories,
            }}
        >
            <div ref={containerRef} className={containerClasses}>
                {labelPosition === 'top' && labelElement}
                <div className={styles['hierarchical-combobox-field-wrapper']}>
                    {labelPosition === 'left' && labelElement}
                    <div id={comboboxId} className={styles['hierarchical-combobox']}>
                        {children}
                    </div>
                </div>
            </div>
        </HierarchicalComboboxContext.Provider>
    );
};

// Input Component (Combobox-like search input)
interface HierarchicalComboboxInputProps {
    className?: string;
}

const HierarchicalComboboxInput = ({ className }: HierarchicalComboboxInputProps) => {
    const dropdown = useHierarchicalComboboxContext();
    const [isHovered, setIsHovered] = useState(false);

    const inputClasses = [styles['hierarchical-combobox__input'], className].filter(Boolean).join(' ');

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        dropdown.handleSelect('', '');
    };

    return (
        <div
            className={styles['hierarchical-combobox__input-wrapper']}
            onClick={() => {
                dropdown.setIsOpen(true);
                dropdown.inputRef.current?.focus();
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <input
                ref={dropdown.inputRef}
                className={inputClasses}
                placeholder={dropdown.placeholder}
                value={dropdown.isOpen ? dropdown.searchQuery : dropdown.selectedLabel || ''}
                onChange={(e) => {
                    dropdown.setSearchQuery(e.target.value);
                    if (!dropdown.isOpen) {
                        dropdown.setIsOpen(true);
                    }
                }}
                onFocus={() => dropdown.setIsOpen(true)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        dropdown.setIsOpen(false);
                        dropdown.setSearchQuery('');
                    }
                }}
                readOnly={false}
            />
            {dropdown.selectedValue && isHovered && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={<IoBackspaceOutline size={16} />}
                    onClick={handleClear}
                    className={styles['hierarchical-combobox__clear']}
                    aria-label="Clear selection"
                />
            )}
            <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<MdExpandMore size={16} />}
                onClick={() => dropdown.setIsOpen(!dropdown.isOpen)}
                className={`${styles['hierarchical-combobox__trigger']} ${dropdown.isOpen ? styles['hierarchical-combobox__trigger--open'] : ''}`}
                aria-label="Toggle menu"
                aria-haspopup="listbox"
                aria-expanded={dropdown.isOpen}
            />
        </div>
    );
};

// Menu Component - Two-column layout (categories + items)
interface HierarchicalComboboxMenuProps {
    children: ReactNode;
    className?: string;
}

const HierarchicalComboboxMenu = ({ children, className }: HierarchicalComboboxMenuProps) => {
    const dropdown = useHierarchicalComboboxContext();
    const [position, setPosition] = useState({ top: 0, right: 0 });

    useEffect(() => {
        const updatePosition = () => {
            if (dropdown.isOpen && dropdown.inputRef.current) {
                const rect = dropdown.inputRef.current.getBoundingClientRect();
                setPosition({
                    top: rect.bottom + window.scrollY + 4,
                    right: window.innerWidth - rect.right + window.scrollX,
                });
            }
        };

        updatePosition();

        const handleScroll = () => {
            updatePosition();
        };

        const handleResize = () => {
            updatePosition();
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                dropdown.setIsOpen(false);
                dropdown.setSearchQuery('');
            }
        };

        if (dropdown.isOpen) {
            window.addEventListener('scroll', handleScroll, true);
            window.addEventListener('resize', handleResize);
            document.addEventListener('keydown', handleKeyDown, true);

            return () => {
                window.removeEventListener('scroll', handleScroll, true);
                window.removeEventListener('resize', handleResize);
                document.removeEventListener('keydown', handleKeyDown, true);
            };
        }
    }, [dropdown.isOpen, dropdown]);

    if (!dropdown.isOpen) {
        return null;
    }

    const handleMenuWrapperClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return createPortal(
        <div
            ref={dropdown.menuRef}
            className={`${styles['hierarchical-combobox__menu']} ${className ?? ''}`}
            style={{
                position: 'absolute',
                top: `${position.top}px`,
                right: `${position.right}px`,
            }}
            onClick={handleMenuWrapperClick}
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    dropdown.setIsOpen(false);
                    dropdown.setSearchQuery('');
                }
            }}
        >
            {children}
        </div>,
        document.body
    );
};

// List Component - Two-column layout
interface HierarchicalComboboxListProps {
    categories?: HierarchicalComboboxCategory[];
    className?: string;
    emptyMessage?: string;
}

const HierarchicalComboboxList = ({ categories: propCategories, className, emptyMessage = 'No options available' }: HierarchicalComboboxListProps) => {
    const dropdown = useHierarchicalComboboxContext();
    const categories = propCategories ?? dropdown.categories;

    // Filter categories based on search query
    const filteredCategories = categories.filter((category) => {
        const categoryMatch = category.label.toLowerCase().includes(dropdown.searchQuery.toLowerCase());
        const itemsMatch = category.items?.some((item) => item.label.toLowerCase().includes(dropdown.searchQuery.toLowerCase()));
        return categoryMatch || itemsMatch;
    });

    // Get items for selected category from original categories
    const selectedCategoryObj = categories.find((c) => c.id === dropdown.selectedCategory);
    const displayItems = selectedCategoryObj?.items || [];

    if (filteredCategories.length === 0) {
        return (
            <div className={`${styles['hierarchical-combobox__list']} ${className ?? ''}`}>
                <div className={styles['hierarchical-combobox__empty']}>{emptyMessage}</div>
            </div>
        );
    }

    return (
        <div className={`${styles['hierarchical-combobox__container']} ${className ?? ''}`}>
            {/* Left column - Categories */}
            <ul className={styles['hierarchical-combobox__categories']}>
                {filteredCategories.map((category) => {
                    const isSelected = dropdown.selectedCategory === category.id;
                    const hasItems = category.items && category.items.length > 0;

                    return (
                        <li key={category.id}>
                            <button
                                className={`${styles['hierarchical-combobox__category']} ${isSelected ? styles['hierarchical-combobox__category--selected'] : ''}`}
                                onClick={() => dropdown.setSelectedCategory(isSelected ? null : category.id)}
                                type="button"
                                tabIndex={-1}
                            >
                                <span className={styles['hierarchical-combobox__category-label']}>{category.label}</span>
                                {hasItems && <MdOutlineChevronRight size={16} className={styles['hierarchical-combobox__category-chevron']} />}
                            </button>
                        </li>
                    );
                })}
            </ul>

            {/* Right column - Items for selected category */}
            <ul className={styles['hierarchical-combobox__items']}>
                {displayItems.length > 0 ? (
                    displayItems
                        .filter((item) => item.label.toLowerCase().includes(dropdown.searchQuery.toLowerCase()))
                        .map((item) => {
                            const isSelected = dropdown.selectedValue === item.id;
                            return (
                                <li key={item.id}>
                                    <button
                                        className={`${styles['hierarchical-combobox__item']} ${isSelected ? styles['hierarchical-combobox__item--selected'] : ''}`}
                                        onClick={() => dropdown.handleSelect(item.id, item.label)}
                                        type="button"
                                        tabIndex={-1}
                                    >
                                        <span className={styles['hierarchical-combobox__item-label']}>{item.label}</span>
                                        {isSelected && <FaCheck size={10} className={styles['hierarchical-combobox__item-check']} />}
                                    </button>
                                </li>
                            );
                        })
                ) : (
                    <div className={styles['hierarchical-combobox__empty']}>Select a category</div>
                )}
            </ul>
        </div>
    );
};

// Export compound components
export const HierarchicalCombobox = {
    Root: HierarchicalComboboxRoot,
    Input: HierarchicalComboboxInput,
    Menu: HierarchicalComboboxMenu,
    List: HierarchicalComboboxList,
};

export type { HierarchicalComboboxRootProps };
