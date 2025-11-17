import React, { createContext, useContext, ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCombobox, type UseComboboxProps, type UseComboboxReturn, type ComboboxOption } from '../../hooks/useCombobox';
import useOutsideClick from '@/hooks/useOutsideClick';
import { Button } from '../Button';
import { FaCheck } from 'react-icons/fa';
import styles from './index.module.scss';

// Context for sharing combobox state
interface ComboboxContextValue extends UseComboboxReturn {}

const ComboboxContext = createContext<ComboboxContextValue | null>(null);

const useComboboxContext = () => {
    const context = useContext(ComboboxContext);
    if (!context) {
        throw new Error('Combobox compound components must be used within Combobox.Root');
    }
    return context;
};

// Root Component
interface ComboboxRootProps extends UseComboboxProps {
    children: ReactNode;
    className?: string;
    label?: string;
    labelPosition?: 'top' | 'left';
    fullWidth?: boolean;
}

const ComboboxRoot = ({ children, className, label, labelPosition = 'top', fullWidth = false, ...props }: ComboboxRootProps) => {
    const combobox = useCombobox(props);

    // Close dropdown when clicking outside
    const handleOutsideClick = React.useCallback(() => {
        if (combobox.isOpen) {
            combobox.setIsOpen(false);
        }
    }, [combobox.isOpen, combobox.setIsOpen]);

    useOutsideClick(combobox.containerRef, handleOutsideClick);

    const comboboxId = `combobox-${Math.random().toString(36).substring(2, 9)}`;

    const containerClasses = [
        styles['combobox-container'],
        styles[`combobox-container--label-${labelPosition}`],
        fullWidth && styles['combobox-container--full-width'],
        className,
    ]
        .filter(Boolean)
        .join(' ');

    const labelElement = label && (
        <label htmlFor={comboboxId} className={styles['combobox-label']}>
            {label}
        </label>
    );

    return (
        <ComboboxContext.Provider value={combobox}>
            <div className={containerClasses}>
                {labelPosition === 'top' && labelElement}
                <div className={styles['combobox-field-wrapper']}>
                    {labelPosition === 'left' && labelElement}
                    <div {...combobox.getComboboxProps()} id={comboboxId} className={styles.combobox}>
                        {children}
                    </div>
                </div>
            </div>
        </ComboboxContext.Provider>
    );
};

// Input Component
interface ComboboxInputProps {
    className?: string;
    icon?: React.ReactNode;
}

const ComboboxInput = ({ className, icon }: ComboboxInputProps) => {
    const combobox = useComboboxContext();

    return (
        <div className={styles['combobox__input-wrapper']}>
            {icon && <span className={styles['combobox__input-icon']}>{icon}</span>}
            <input {...combobox.getInputProps()} className={`${styles['combobox__input']} ${className ?? ''}`} />
        </div>
    );
};

// Trigger Component
interface ComboboxTriggerProps {
    className?: string;
    children?: ReactNode;
    icon?: React.ReactNode;
}

const ComboboxTrigger = ({ className, children, icon }: ComboboxTriggerProps) => {
    const combobox = useComboboxContext();
    const triggerProps = combobox.getTriggerProps();

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={children ?? icon}
            onClick={triggerProps.onClick}
            disabled={triggerProps.disabled}
            className={`${styles['combobox__trigger']} ${combobox.isOpen ? styles['combobox__trigger--open'] : ''} ${className ?? ''}`}
            aria-label={triggerProps['aria-label']}
            aria-haspopup="listbox"
            aria-expanded={combobox.isOpen}
        />
    );
};

// Clear Button Component
interface ComboboxClearProps {
    className?: string;
}

const ComboboxClear = ({ className }: ComboboxClearProps) => {
    const combobox = useComboboxContext();

    if (!combobox.selectedValue) {
        return null;
    }

    return (
        <button
            onClick={combobox.handleClear}
            className={`${styles['combobox__clear']} ${className ?? ''}`}
            type="button"
            aria-label="Clear selection"
        >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2L10 10M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        </button>
    );
};

// Dropdown Component
interface ComboboxDropdownProps {
    children: ReactNode;
    className?: string;
}

const ComboboxDropdown = ({ children, className }: ComboboxDropdownProps) => {
    const combobox = useComboboxContext();
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (combobox.isOpen && combobox.containerRef.current) {
            const rect = combobox.containerRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        }
    }, [combobox.isOpen, combobox.containerRef]);

    // Handle outside click for Portal-rendered dropdown
    useEffect(() => {
        if (!combobox.isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isClickInsideContainer = combobox.containerRef.current?.contains(target);
            const isClickInsideDropdown = dropdownRef.current?.contains(target);

            if (!isClickInsideContainer && !isClickInsideDropdown) {
                combobox.setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [combobox.isOpen]);

    if (!combobox.isOpen) {
        return null;
    }

    return createPortal(
        <div
            ref={dropdownRef}
            className={`${styles['combobox__dropdown']} ${className ?? ''}`}
            style={{
                position: 'absolute',
                top: `${position.top}px`,
                left: `${position.left}px`,
                width: `${position.width}px`,
            }}
        >
            {children}
        </div>,
        document.body
    );
};

// List Component
interface ComboboxListProps {
    children?: (option: ComboboxOption, index: number) => ReactNode;
    className?: string;
    emptyMessage?: string;
}

const ComboboxList = ({ children, className, emptyMessage = 'No results found' }: ComboboxListProps) => {
    const combobox = useComboboxContext();

    return (
        <ul {...combobox.getListProps()} className={`${styles['combobox__list']} ${className ?? ''}`}>
            {combobox.filteredOptions.length === 0 ? (
                <li className={styles['combobox__empty']}>{emptyMessage}</li>
            ) : (
                <>
                    {children
                        ? combobox.filteredOptions.map((option, index) => children(option, index))
                        : combobox.filteredOptions.map((option, index) => (
                              <ComboboxOption key={option.value} option={option} index={index} />
                          ))}
                </>
            )}
        </ul>
    );
};

// Option Component
interface ComboboxOptionProps {
    option: ComboboxOption;
    index: number;
    className?: string;
    children?: ReactNode;
}

const ComboboxOption = ({ option, index, className, children }: ComboboxOptionProps) => {
    const combobox = useComboboxContext();
    const props = combobox.getOptionProps(option, index);
    const isSelected = props['aria-selected'];
    const isFocused = props['data-focused'];
    const isDisabled = props['aria-disabled'];

    return (
        <li
            {...props}
            className={`${styles['combobox__option']} ${className ?? ''} ${isSelected ? styles['combobox__option--selected'] : ''} ${
                isFocused ? styles['combobox__option--focused'] : ''
            } ${isDisabled ? styles['combobox__option--disabled'] : ''}`}
        >
            {children ?? (
                <>
                    <span className={styles['combobox__option-label']}>{option.label}</span>
                    {isSelected && <FaCheck size={10} className={styles['combobox__option-check']} />}
                </>
            )}
        </li>
    );
};

// Export compound components
export const Combobox = {
    Root: ComboboxRoot,
    Input: ComboboxInput,
    Trigger: ComboboxTrigger,
    Clear: ComboboxClear,
    Dropdown: ComboboxDropdown,
    List: ComboboxList,
    Option: ComboboxOption,
};

// Export types
export type { ComboboxOption, UseComboboxProps };
