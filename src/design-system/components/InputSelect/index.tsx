import React, { forwardRef, useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Tooltip } from 'react-tooltip';
import { ArrowDown } from '@/assets/icons/Icon';
import { FaCheck } from 'react-icons/fa';
import styles from './index.module.scss';
import { Button } from '../Button';

const INPUT_SELECT_TOOLTIP_Z_INDEX = 100000;
/** Breathing room the menu keeps from either viewport edge when it is wider than its trigger. */
const MENU_VIEWPORT_MARGIN = 8;
const DEFAULT_MENU_MAX_WIDTH = 420;

export interface InputSelectOptionBadge {
    /** Text inside the chip. Kept short — it sits on the option row beside the name. */
    label: string;
    /** Any CSS colour. Drawn as the chip's text and border, over a faded fill of the same hue. */
    color: string;
}

export interface InputSelectOption {
    label: string;
    value: string;
    /**
     * Secondary line under the label — where a label alone is ambiguous.
     *
     * A table list is the case this exists for: `database.owner.table` in one line is wider than
     * any field it fits in, so the option carries the bare name as its label and the qualifying
     * parts here, where they read as context rather than as part of the name.
     */
    description?: string;
    /** Tooltip content. Defaults to `label`, which is not enough once a description carries half the identity. */
    tooltip?: string;
    /**
     * A short coloured tag drawn beside the label — what kind of thing this option is, when the
     * name alone does not say. The table list uses it to mark tag / log / view / transaction, in
     * the colours DB Explorer already paints those types.
     */
    badge?: InputSelectOptionBadge;
    disabled?: boolean;
}

export type InputSelectSize = 'sm' | 'md' | 'lg';
export type InputSelectVariant = 'default' | 'error' | 'success';
export type InputSelectLabelPosition = 'top' | 'left';
export type InputSelectLabelAlign = 'left' | 'right';

export interface InputSelectProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
    /**
     * Component size
     */
    size?: InputSelectSize;
    /**
     * Visual variant
     */
    variant?: InputSelectVariant;
    /**
     * Error message to display
     */
    error?: string;
    /**
     * Label text
     */
    label?: string | React.ReactNode;
    /**
     * Label position
     */
    labelPosition?: InputSelectLabelPosition;
    /**
     * Label text alignment
     */
    labelAlign?: InputSelectLabelAlign;
    /**
     * Helper text below input
     */
    helperText?: string;
    /**
     * Full width mode
     */
    fullWidth?: boolean;
    /**
     * Left icon element
     */
    leftIcon?: React.ReactNode;
    /**
     * Dropdown options
     */
    options: InputSelectOption[];
    /**
     * Currently selected value
     */
    selectValue?: string;
    /**
     * Callback when option is selected
     */
    onSelectChange?: (value: string) => void;
    /**
     * Placeholder for dropdown trigger
     */
    selectPlaceholder?: string;
    /**
     * `trigger` pins the menu to the field's width, as it has always been. `auto` lets it grow to
     * its content — the field width is the floor, `menuMaxWidth` and the viewport are the ceiling —
     * and shifts it left when it would otherwise run off the right edge.
     */
    /**
     * Puts a search box at the top of the menu and narrows the list as it is typed in.
     *
     * Off by default, and deliberately separate from the field itself: this component's text input
     * *is* the value — the dashboard's Table field stores what is typed there verbatim, which is
     * how a `{{variable}}` table is entered — so it cannot double as a filter.
     */
    searchable?: boolean;
    /** Placeholder for that search box. */
    searchPlaceholder?: string;
    menuWidth?: 'trigger' | 'auto';
    /** Ceiling for `menuWidth="auto"`. */
    menuMaxWidth?: number;
}

/**
 * The chip drawn beside an option's name.
 *
 * The colour arrives as a plain CSS colour from the caller — DB Explorer's table-type palette, so
 * a table reads the same here as it does in the tree. `color-mix` fades that same hue for the fill
 * rather than hard-coding a second value, which keeps the chip legible on both themes.
 */
const renderBadge = (aBadge?: InputSelectOptionBadge) => {
    if (!aBadge?.label) return null;
    return (
        <span
            className={styles['input-select-option-badge']}
            style={{ color: aBadge.color, borderColor: aBadge.color, backgroundColor: `color-mix(in srgb, ${aBadge.color} 16%, transparent)` }}
        >
            {aBadge.label}
        </span>
    );
};

export const InputSelect = forwardRef<HTMLInputElement, InputSelectProps>(
    (
        {
            size = 'md',
            variant = 'default',
            error,
            label,
            labelPosition = 'top',
            labelAlign = 'left',
            helperText,
            fullWidth = false,
            leftIcon,
            options = [],
            selectValue = '',
            onSelectChange,
            selectPlaceholder = 'Select...',
            searchable = false,
            searchPlaceholder = 'Search...',
            menuWidth = 'trigger',
            menuMaxWidth = DEFAULT_MENU_MAX_WIDTH,
            className,
            disabled,
            id,
            style,
            ...props
        },
        ref
    ) => {
        const [isOpen, setIsOpen] = useState(false);
        const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 300, showAbove: false });
        const [menuLeftAdjust, setMenuLeftAdjust] = useState<number | null>(null);
        const [focusedIndex, setFocusedIndex] = useState(-1);
        const [searchQuery, setSearchQuery] = useState('');

        /**
         * What the menu actually shows. Everything below works from this rather than `options`, so
         * keyboard navigation and Enter land on the row the user can see.
         *
         * The description is matched as well as the label, for the reason the table list splits the
         * two in the first place: `MACHBASEDB.SYS.ATABLE` is shown as `ATABLE` over `MACHBASEDB ·
         * SYS`, and typing the database name would otherwise find nothing.
         */
        const visibleOptions = React.useMemo(() => {
            const sQuery = searchQuery.trim().toLowerCase();
            if (!searchable || !sQuery) return options;
            return options.filter((aOption) => `${aOption.label} ${aOption.description ?? ''}`.toLowerCase().includes(sQuery));
        }, [options, searchQuery, searchable]);

        const uniqueId = React.useId().replace(/:/g, '');
        const inputId = id || `input-select-${uniqueId}`;
        const listboxId = `${inputId}-listbox`;
        const tooltipId = `input-select-tooltip-${uniqueId}`;
        const finalVariant = error ? 'error' : variant;

        const wrapperRef = useRef<HTMLDivElement>(null);
        const menuRef = useRef<HTMLDivElement>(null);
        const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
        const shouldFocusOptionRef = useRef(false);
        const searchInputRef = useRef<HTMLInputElement>(null);

        useEffect(() => {
            if (!isOpen || focusedIndex < 0 || !shouldFocusOptionRef.current) return;

            const focusTimer = window.setTimeout(() => {
                optionRefs.current[focusedIndex]?.focus({ preventScroll: true });
                shouldFocusOptionRef.current = false;
            }, 0);

            return () => window.clearTimeout(focusTimer);
        }, [focusedIndex, isOpen]);

        // A query only describes the menu that is open. Leaving it behind would reopen the field
        // showing a filtered list with no visible reason for the missing rows.
        useEffect(() => {
            if (isOpen) {
                if (searchable) searchInputRef.current?.focus({ preventScroll: true });
                return;
            }
            setSearchQuery('');
            setFocusedIndex(-1);
        }, [isOpen, searchable]);

        // Calculate dropdown position
        const updatePosition = useCallback(() => {
            if (!wrapperRef.current) return;

            const rect = wrapperRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;
            const menuHeight = 300;
            const gap = 4;

            // Determine if menu should show above
            const shouldShowAbove = spaceBelow < 150 && spaceAbove > spaceBelow;

            let maxHeight: number;
            let top: number;

            if (shouldShowAbove) {
                maxHeight = Math.min(menuHeight, Math.max(100, spaceAbove - gap - 20));
                top = rect.top - gap;
            } else {
                maxHeight = Math.min(menuHeight, Math.max(100, spaceBelow - gap - 20));
                top = rect.bottom + gap;
            }

            setPosition({
                top,
                left: rect.left,
                width: rect.width,
                maxHeight,
                showAbove: shouldShowAbove,
            });
        }, []);

        // Update position when dropdown opens
        useEffect(() => {
            if (isOpen) {
                updatePosition();
            }
        }, [isOpen, updatePosition]);

        // Update position on scroll and resize
        useEffect(() => {
            if (!isOpen) return;

            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);

            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }, [isOpen, updatePosition]);

        // An auto-width menu is only measurable once it is mounted, so the horizontal correction
        // lands here rather than in updatePosition. useLayoutEffect runs before paint, so the menu
        // is never seen at the uncorrected left. The computation always starts from position.left,
        // never from the corrected value, so repeated runs converge instead of drifting.
        useLayoutEffect(() => {
            if (!isOpen || menuWidth !== 'auto') {
                setMenuLeftAdjust(null);
                return;
            }
            const menuElement = menuRef.current;
            if (!menuElement) return;

            const rightLimit = window.innerWidth - MENU_VIEWPORT_MARGIN - menuElement.offsetWidth;
            const nextLeft = Math.max(MENU_VIEWPORT_MARGIN, Math.min(position.left, rightLimit));
            setMenuLeftAdjust(nextLeft === position.left ? null : nextLeft);
        }, [isOpen, menuWidth, position.left, visibleOptions]);

        // Handle outside click
        useEffect(() => {
            if (!isOpen) return;

            const handleClickOutside = (event: MouseEvent) => {
                const target = event.target as Node;
                const isClickInsideWrapper = wrapperRef.current?.contains(target);
                const isClickInsideMenu = menuRef.current?.contains(target);

                if (!isClickInsideWrapper && !isClickInsideMenu) {
                    setIsOpen(false);
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [isOpen]);

        const handleToggle = () => {
            if (!disabled) {
                setIsOpen(!isOpen);
            }
        };

        const focusTrigger = () => {
            wrapperRef.current?.querySelector('button')?.focus({ preventScroll: true });
        };

        const getOptionId = (index: number) => `${listboxId}-option-${index}`;

        const handleSelect = (option: InputSelectOption, restoreFocus = false) => {
            if (option.disabled) return;
            onSelectChange?.(option.value);
            setIsOpen(false);
            if (restoreFocus) focusTrigger();
        };

        const getNextEnabledOptionIndex = (startIndex: number, direction: 1 | -1) => {
            if (visibleOptions.length === 0) return -1;

            for (let offset = 0; offset < visibleOptions.length; offset += 1) {
                const index = (startIndex + offset * direction + visibleOptions.length) % visibleOptions.length;
                if (!visibleOptions[index].disabled) return index;
            }

            return -1;
        };

        // Keyboard navigation
        const handleKeyDown = (event: React.KeyboardEvent) => {
            if (disabled) return;

            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    if (visibleOptions.length === 0) {
                        setIsOpen(true);
                        break;
                    }
                    setIsOpen(true);
                    {
                        const nextIndex = getNextEnabledOptionIndex(!isOpen || focusedIndex < 0 ? 0 : focusedIndex + 1, 1);
                        shouldFocusOptionRef.current = nextIndex >= 0;
                        setFocusedIndex(nextIndex);
                    }
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    if (visibleOptions.length === 0) {
                        setIsOpen(true);
                        break;
                    }
                    setIsOpen(true);
                    {
                        const nextIndex = getNextEnabledOptionIndex(!isOpen || focusedIndex < 0 ? visibleOptions.length - 1 : focusedIndex - 1, -1);
                        shouldFocusOptionRef.current = nextIndex >= 0;
                        setFocusedIndex(nextIndex);
                    }
                    break;
                case 'Enter':
                    event.preventDefault();
                    if (isOpen && focusedIndex >= 0 && visibleOptions[focusedIndex]) {
                        handleSelect(visibleOptions[focusedIndex], true);
                    } else {
                        setIsOpen(!isOpen);
                    }
                    break;
                case 'Escape':
                    event.preventDefault();
                    setIsOpen(false);
                    focusTrigger();
                    break;
            }
        };

        const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
            props.onKeyDown?.(event);
            if (!event.defaultPrevented && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
                handleKeyDown(event);
            }
        };

        const containerClasses = [
            styles['input-select-container'],
            styles[`input-select-container--label-${labelPosition}`],
            fullWidth && styles['input-select-container--full-width'],
            className,
        ]
            .filter(Boolean)
            .join(' ');

        const wrapperClasses = [
            styles['input-select-wrapper'],
            styles[`input-select-wrapper--${size}`],
            styles[`input-select-wrapper--${finalVariant}`],
            disabled && styles['input-select-wrapper--disabled'],
            leftIcon && styles['input-select-wrapper--has-left-icon'],
        ]
            .filter(Boolean)
            .join(' ');

        const labelElement = label && (
            <label htmlFor={inputId} className={`${styles['input-select-label']} ${labelAlign === 'right' ? styles['input-select-label--align-right'] : ''}`}>
                {label}
            </label>
        );
        const activeDescendantId = isOpen && focusedIndex >= 0 && options[focusedIndex] && !options[focusedIndex].disabled ? getOptionId(focusedIndex) : undefined;

        const inputElement = (
            <input
                ref={ref}
                id={inputId}
                className={styles['input-select-input']}
                disabled={disabled}
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={listboxId}
                aria-activedescendant={activeDescendantId}
                aria-autocomplete="none"
                {...props}
                onKeyDown={handleInputKeyDown}
            />
        );

        const menuSizeStyle: React.CSSProperties =
            menuWidth === 'auto'
                ? {
                      minWidth: `${position.width}px`,
                      width: 'max-content',
                      maxWidth: `min(${menuMaxWidth}px, calc(100vw - ${MENU_VIEWPORT_MARGIN * 2}px))`,
                  }
                : { width: `${position.width}px` };

        return (
            <div className={containerClasses}>
                {labelPosition === 'top' && labelElement}
                <div className={styles['input-select-field-wrapper']}>
                    {labelPosition === 'left' && labelElement}
                    <div ref={wrapperRef} className={wrapperClasses} style={style}>
                        {leftIcon && <span className={styles['input-select-icon--left']}>{leftIcon}</span>}
                        {inputElement}
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={disabled}
                            onClick={handleToggle}
                            onKeyDown={handleKeyDown}
                            className={styles['input-select-trigger']}
                            aria-label="Toggle options"
                            aria-haspopup="listbox"
                            aria-expanded={isOpen}
                            aria-controls={listboxId}
                        >
                            <ArrowDown
                                size={14}
                                style={{
                                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s',
                                }}
                            />
                        </Button>
                    </div>
                </div>
                {(error || helperText) && (
                    <div className={`${styles['input-select-helper-text']} ${error ? styles['input-select-helper-text--error'] : ''}`}>{error || helperText}</div>
                )}
                {isOpen &&
                    createPortal(
                        <>
                            <div
                                ref={menuRef}
                                className={`${styles['input-select-menu']} scrollbar-dark`}
                                style={{
                                    position: 'fixed',
                                    ...(position.showAbove
                                        ? {
                                              bottom: `${window.innerHeight - position.top}px`,
                                              top: 'auto',
                                          }
                                        : {
                                              top: `${position.top}px`,
                                          }),
                                    left: `${menuLeftAdjust ?? position.left}px`,
                                    ...menuSizeStyle,
                                    maxHeight: `${position.maxHeight}px`,
                                }}
                            >
                                {searchable && (
                                    <div className={styles['input-select-search']}>
                                        <input
                                            ref={searchInputRef}
                                            className={styles['input-select-search-input']}
                                            type="text"
                                            value={searchQuery}
                                            placeholder={searchPlaceholder}
                                            aria-label={searchPlaceholder}
                                            autoComplete="off"
                                            onChange={(event) => {
                                                setSearchQuery(event.target.value);
                                                setFocusedIndex(-1);
                                            }}
                                            // Arrow keys and Enter belong to the list even while the caret is here.
                                            onKeyDown={handleKeyDown}
                                        />
                                    </div>
                                )}
                                <ul id={listboxId} className={styles['input-select-list']} role="listbox">
                                    {visibleOptions.map((option, index) => {
                                        const isSelected = option.value === selectValue;
                                        const isFocused = index === focusedIndex;

                                        return (
                                            <li
                                                key={option.value}
                                                ref={(element) => {
                                                    optionRefs.current[index] = element;
                                                }}
                                                id={getOptionId(index)}
                                                className={`${styles['input-select-option']} ${isSelected ? styles['input-select-option--selected'] : ''} ${
                                                    isFocused ? styles['input-select-option--focused'] : ''
                                                } ${option.disabled ? styles['input-select-option--disabled'] : ''}`}
                                                role="option"
                                                aria-disabled={option.disabled ? 'true' : undefined}
                                                aria-selected={isSelected}
                                                tabIndex={!option.disabled && isFocused ? 0 : -1}
                                                data-tooltip-id={tooltipId}
                                                data-tooltip-content={option.tooltip ?? option.label}
                                                onClick={() => handleSelect(option)}
                                                onFocus={() => setFocusedIndex(index)}
                                                onKeyDown={handleKeyDown}
                                                onMouseEnter={() => {
                                                    if (!option.disabled) setFocusedIndex(index);
                                                }}
                                            >
                                                {option.description ? (
                                                    <span className={styles['input-select-option-text']}>
                                                        <span className={styles['input-select-option-title']}>
                                                            <span className={styles['input-select-option-label']}>{option.label}</span>
                                                            {renderBadge(option.badge)}
                                                        </span>
                                                        <span className={styles['input-select-option-description']}>{option.description}</span>
                                                    </span>
                                                ) : (
                                                    <span className={styles['input-select-option-title']}>
                                                        <span className={styles['input-select-option-label']}>{option.label}</span>
                                                        {renderBadge(option.badge)}
                                                    </span>
                                                )}
                                                {isSelected && <FaCheck size={10} className={styles['input-select-option-check']} />}
                                            </li>
                                        );
                                    })}
                                    {searchable && visibleOptions.length === 0 && <li className={styles['input-select-option--empty']}>No match</li>}
                                </ul>
                            </div>
                            <Tooltip
                                id={tooltipId}
                                className="tooltip-div"
                                positionStrategy="fixed"
                                delayShow={700}
                                style={{
                                    zIndex: INPUT_SELECT_TOOLTIP_Z_INDEX,
                                    maxWidth: 'min(480px, calc(100vw - 24px))',
                                    whiteSpace: 'normal',
                                    wordBreak: 'break-all',
                                }}
                            />
                        </>,
                        document.body
                    )}
            </div>
        );
    }
);

InputSelect.displayName = 'InputSelect';
