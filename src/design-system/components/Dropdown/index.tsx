import React, { createContext, useContext, ReactNode, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDropdown, type UseDropdownProps, type UseDropdownReturn, type DropdownOption } from '../../hooks/useDropdown';
import useOutsideClick from '@/hooks/useOutsideClick';
import { MdOutlineKeyboardArrowDown } from 'react-icons/md';
import { FaCheck } from 'react-icons/fa';
import styles from './index.module.scss';

// Context for sharing dropdown state
interface DropdownContextValue extends UseDropdownReturn {}

const DropdownContext = createContext<DropdownContextValue | null>(null);

const useDropdownContext = () => {
    const context = useContext(DropdownContext);
    if (!context) {
        throw new Error('Dropdown compound components must be used within Dropdown.Root');
    }
    return context;
};

// Root Component
interface DropdownRootProps extends UseDropdownProps {
    children: ReactNode;
    className?: string;
    label?: string;
    labelPosition?: 'top' | 'left';
    fullWidth?: boolean;
}

const DropdownRoot = ({ children, className, label, labelPosition = 'top', fullWidth = false, ...props }: DropdownRootProps) => {
    const dropdown = useDropdown(props);

    // Close dropdown when clicking outside
    const handleOutsideClick = React.useCallback(() => {
        if (dropdown.isOpen) {
            dropdown.setIsOpen(false);
        }
    }, [dropdown.isOpen, dropdown.setIsOpen]);

    useOutsideClick(dropdown.containerRef, handleOutsideClick);

    const dropdownId = `dropdown-${Math.random().toString(36).substr(2, 9)}`;

    const containerClasses = [
        styles['dropdown-container'],
        styles[`dropdown-container--label-${labelPosition}`],
        fullWidth && styles['dropdown-container--full-width'],
        className,
    ]
        .filter(Boolean)
        .join(' ');

    const labelElement = label && (
        <label htmlFor={dropdownId} className={styles['dropdown-label']}>
            {label}
        </label>
    );

    return (
        <DropdownContext.Provider value={dropdown}>
            <div className={containerClasses}>
                {labelPosition === 'top' && labelElement}
                <div className={styles['dropdown-field-wrapper']}>
                    {labelPosition === 'left' && labelElement}
                    <div {...dropdown.getDropdownProps()} id={dropdownId} className={styles.dropdown}>
                        {children}
                    </div>
                </div>
            </div>
        </DropdownContext.Provider>
    );
};

// Trigger Component - displays selected value and opens dropdown
interface DropdownTriggerProps {
    className?: string;
    children?: (selectedOption: DropdownOption | undefined, isOpen: boolean) => ReactNode;
}

const DropdownTrigger = ({ className, children }: DropdownTriggerProps) => {
    const dropdown = useDropdownContext();

    const triggerClasses = [
        styles['dropdown__trigger'],
        dropdown.selectedOption ? styles['dropdown__trigger--has-value'] : styles['dropdown__trigger--placeholder'],
        dropdown.isOpen && styles['dropdown__trigger--open'],
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button
            {...dropdown.getTriggerProps()}
            className={triggerClasses}
        >
            {children ? (
                children(dropdown.selectedOption, dropdown.isOpen)
            ) : (
                <>
                    <span className={styles['dropdown__trigger-text']}>{dropdown.selectedOption?.label ?? dropdown.placeholder}</span>
                    <MdOutlineKeyboardArrowDown
                        size={16}
                        className={`${styles['dropdown__trigger-icon']} ${dropdown.isOpen ? styles['dropdown__trigger-icon--open'] : ''}`}
                    />
                </>
            )}
        </button>
    );
};

// Menu Component - dropdown menu container with Portal
interface DropdownMenuProps {
    children: ReactNode;
    className?: string;
}

const DropdownMenu = ({ children, className }: DropdownMenuProps) => {
    const dropdown = useDropdownContext();
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (dropdown.isOpen && dropdown.triggerRef.current) {
            const rect = dropdown.triggerRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        }
    }, [dropdown.isOpen]);

    // Handle outside click for Portal-rendered menu
    useEffect(() => {
        if (!dropdown.isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isClickInsideTrigger = dropdown.containerRef.current?.contains(target);
            const isClickInsideMenu = menuRef.current?.contains(target);

            if (!isClickInsideTrigger && !isClickInsideMenu) {
                dropdown.setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdown.isOpen]);

    if (!dropdown.isOpen) {
        return null;
    }

    return createPortal(
        <div
            ref={menuRef}
            className={`${styles['dropdown__menu']} ${className ?? ''}`}
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

// List Component - list of options
interface DropdownListProps {
    children?: (option: DropdownOption, index: number) => ReactNode;
    className?: string;
}

const DropdownList = ({ children, className }: DropdownListProps) => {
    const dropdown = useDropdownContext();

    return (
        <ul {...dropdown.getListProps()} className={`${styles['dropdown__list']} ${className ?? ''}`}>
            {children
                ? dropdown.options.map((option, index) => children(option, index))
                : dropdown.options.map((option, index) => <DropdownOption key={option.value} option={option} index={index} />)}
        </ul>
    );
};

// Option Component - individual option item
interface DropdownOptionProps {
    option: DropdownOption;
    index: number;
    className?: string;
    children?: ReactNode;
}

const DropdownOption = ({ option, index, className, children }: DropdownOptionProps) => {
    const dropdown = useDropdownContext();
    const props = dropdown.getOptionProps(option, index);
    const isSelected = props['aria-selected'];
    const isFocused = props['data-focused'];
    const isDisabled = props['aria-disabled'];

    return (
        <li
            {...props}
            className={`${styles['dropdown__option']} ${className ?? ''} ${isSelected ? styles['dropdown__option--selected'] : ''} ${
                isFocused ? styles['dropdown__option--focused'] : ''
            } ${isDisabled ? styles['dropdown__option--disabled'] : ''}`}
        >
            {children ?? (
                <>
                    <span className={styles['dropdown__option-label']}>{option.label}</span>
                    {isSelected && <FaCheck size={10} className={styles['dropdown__option-check']} />}
                </>
            )}
        </li>
    );
};

// Export compound components
export const Dropdown = {
    Root: DropdownRoot,
    Trigger: DropdownTrigger,
    Menu: DropdownMenu,
    List: DropdownList,
    Option: DropdownOption,
};

// Export types
export type { DropdownOption, UseDropdownProps };
