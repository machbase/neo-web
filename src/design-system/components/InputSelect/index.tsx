import React, { forwardRef, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown } from '@/assets/icons/Icon';
import { FaCheck } from 'react-icons/fa';
import styles from './index.module.scss';
import { Button } from '../Button';

export interface InputSelectOption {
    label: string;
    value: string;
    disabled?: boolean;
}

export type InputSelectSize = 'sm' | 'md' | 'lg';
export type InputSelectVariant = 'default' | 'error' | 'success';
export type InputSelectLabelPosition = 'top' | 'left';

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
}

export const InputSelect = forwardRef<HTMLInputElement, InputSelectProps>(
    (
        {
            size = 'md',
            variant = 'default',
            error,
            label,
            labelPosition = 'top',
            helperText,
            fullWidth = false,
            leftIcon,
            options = [],
            selectValue = '',
            onSelectChange,
            selectPlaceholder = 'Select...',
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
        const [focusedIndex, setFocusedIndex] = useState(-1);

        const inputId = id || `input-select-${Math.random().toString(36).substr(2, 9)}`;
        const finalVariant = error ? 'error' : variant;

        const wrapperRef = useRef<HTMLDivElement>(null);
        const menuRef = useRef<HTMLDivElement>(null);

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

        const handleSelect = (option: InputSelectOption) => {
            if (option.disabled) return;
            onSelectChange?.(option.value);
            setIsOpen(false);
        };

        // Keyboard navigation
        const handleKeyDown = (event: React.KeyboardEvent) => {
            if (disabled) return;

            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    if (!isOpen) {
                        setIsOpen(true);
                    } else {
                        setFocusedIndex((prev) => {
                            const nextIndex = prev + 1;
                            return nextIndex >= options.length ? 0 : nextIndex;
                        });
                    }
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    if (!isOpen) {
                        setIsOpen(true);
                    } else {
                        setFocusedIndex((prev) => {
                            const nextIndex = prev - 1;
                            return nextIndex < 0 ? options.length - 1 : nextIndex;
                        });
                    }
                    break;
                case 'Enter':
                    event.preventDefault();
                    if (isOpen && focusedIndex >= 0) {
                        handleSelect(options[focusedIndex]);
                    } else {
                        setIsOpen(!isOpen);
                    }
                    break;
                case 'Escape':
                    event.preventDefault();
                    setIsOpen(false);
                    break;
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
            <label htmlFor={inputId} className={styles['input-select-label']}>
                {label}
            </label>
        );

        return (
            <div className={containerClasses}>
                {labelPosition === 'top' && labelElement}
                <div className={styles['input-select-field-wrapper']}>
                    {labelPosition === 'left' && labelElement}
                    <div ref={wrapperRef} className={wrapperClasses} style={style}>
                        {leftIcon && <span className={styles['input-select-icon--left']}>{leftIcon}</span>}
                        <input ref={ref} id={inputId} className={styles['input-select-input']} disabled={disabled} {...props} />
                        <Button size="sm" variant="ghost" disabled={disabled} onClick={handleToggle} onKeyDown={handleKeyDown} className={styles['input-select-trigger']}>
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
                                left: `${position.left}px`,
                                width: `${position.width}px`,
                                maxHeight: `${position.maxHeight}px`,
                            }}
                        >
                            <ul className={styles['input-select-list']}>
                                {options.map((option, index) => {
                                    const isSelected = option.value === selectValue;
                                    const isFocused = index === focusedIndex;

                                    return (
                                        <li
                                            key={option.value}
                                            className={`${styles['input-select-option']} ${isSelected ? styles['input-select-option--selected'] : ''} ${
                                                isFocused ? styles['input-select-option--focused'] : ''
                                            } ${option.disabled ? styles['input-select-option--disabled'] : ''}`}
                                            onClick={() => handleSelect(option)}
                                            onMouseEnter={() => setFocusedIndex(index)}
                                        >
                                            <span className={styles['input-select-option-label']}>{option.label}</span>
                                            {isSelected && <FaCheck size={10} className={styles['input-select-option-check']} />}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>,
                        document.body
                    )}
            </div>
        );
    }
);

InputSelect.displayName = 'InputSelect';
