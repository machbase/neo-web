import React, { createContext, useContext, ReactNode, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import useOutsideClick from '@/hooks/useOutsideClick';
import styles from './index.module.scss';

// Context for sharing menu state
interface MenuContextValue {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    triggerRef: React.RefObject<HTMLButtonElement>;
    containerRef: React.RefObject<HTMLDivElement>;
}

const MenuContext = createContext<MenuContextValue | null>(null);

const useMenuContext = () => {
    const context = useContext(MenuContext);
    if (!context) {
        throw new Error('Menu compound components must be used within Menu.Root');
    }
    return context;
};

// Root Component
interface MenuRootProps {
    children: ReactNode;
    className?: string;
}

const MenuRoot = ({ children, className }: MenuRootProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    const handleOutsideClick = React.useCallback(() => {
        if (isOpen) {
            setIsOpen(false);
        }
    }, [isOpen]);

    useOutsideClick(containerRef, handleOutsideClick);

    // Close menu when pressing ESC
    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscKey);
        return () => document.removeEventListener('keydown', handleEscKey);
    }, [isOpen]);

    return (
        <MenuContext.Provider value={{ isOpen, setIsOpen, triggerRef, containerRef }}>
            <div ref={containerRef} className={`${styles.menu} ${className ?? ''}`}>
                {children}
            </div>
        </MenuContext.Provider>
    );
};

// Trigger Component
interface MenuTriggerProps {
    children: ReactNode;
    className?: string;
}

const MenuTrigger = ({ children, className }: MenuTriggerProps) => {
    const { isOpen, setIsOpen, triggerRef } = useMenuContext();

    const handleClick = () => {
        setIsOpen(!isOpen);
    };

    return (
        <button ref={triggerRef} onClick={handleClick} className={`${styles['menu__trigger']} ${className ?? ''}`} type="button">
            {children}
        </button>
    );
};

// Content Component (Portal-rendered menu)
interface MenuContentProps {
    children: ReactNode;
    className?: string;
    align?: 'left' | 'right';
}

const MenuContent = ({ children, className, align = 'left' }: MenuContentProps) => {
    const { isOpen, setIsOpen, triggerRef, containerRef } = useMenuContext();
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    // Calculate position and prevent overflow
    useEffect(() => {
        if (isOpen && triggerRef.current && menuRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const menuRect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let top = triggerRect.bottom + window.scrollY + 4;
            let left = align === 'left' ? triggerRect.left + window.scrollX + 8 : triggerRect.right + window.scrollX - menuRect.width;

            // Adjust if menu overflows right
            if (left + menuRect.width > viewportWidth) {
                left = viewportWidth - menuRect.width - 8;
            }

            // Adjust if menu overflows left
            if (left < 0) {
                left = 8;
            }

            // Adjust if menu overflows bottom
            if (top + menuRect.height > viewportHeight + window.scrollY) {
                top = triggerRect.top + window.scrollY - menuRect.height - 4;
            }

            setPosition({ top, left });
        }
    }, [isOpen, align]);

    // Handle outside click for Portal
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isClickInsideTrigger = containerRef.current?.contains(target);
            const isClickInsideMenu = menuRef.current?.contains(target);
            if (!isClickInsideTrigger && !isClickInsideMenu) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, setIsOpen, containerRef]);

    if (!isOpen) return null;

    return createPortal(
        <div ref={menuRef} className={`${styles['menu__content']} ${className ?? ''}`} style={{ position: 'absolute', top: `${position.top}px`, left: `${position.left}px` }}>
            {children}
        </div>,
        document.body
    );
};

// Item Component
interface MenuItemProps {
    children: ReactNode;
    onClick?: () => void;
    icon?: ReactNode;
    rightIcon?: ReactNode;
    disabled?: boolean;
    className?: string;
}

const MenuItem = ({ children, onClick, icon, disabled = false, className, rightIcon }: MenuItemProps) => {
    const { setIsOpen } = useMenuContext();

    const handleClick = () => {
        if (disabled) return;
        onClick?.();
        setIsOpen(false);
    };

    const itemClasses = [styles['menu__item'], disabled && styles['menu__item--disabled'], className].filter(Boolean).join(' ');

    return (
        <button type="button" className={itemClasses} onClick={handleClick} disabled={disabled}>
            {icon && <span className={styles['menu__item-icon']}>{icon}</span>}
            <span className={styles['menu__item-label']}>{children}</span>
            {rightIcon && <span className={styles['menu__item-icon']}>{rightIcon}</span>}
        </button>
    );
};

// Divider Component
const MenuDivider = () => {
    return <div className={styles['menu__divider']} />;
};

// Export compound component
export const Menu = {
    Root: MenuRoot,
    Trigger: MenuTrigger,
    Content: MenuContent,
    Item: MenuItem,
    Divider: MenuDivider,
};
