import { createContext, useContext, ReactNode } from 'react';
import { useGNB, type GNBItem } from '@/design-system/hooks/useGNB';
import { Button } from '@/design-system/components/Button';
import styles from './index.module.scss';

// Context for sharing GNB state
interface GNBContextValue {
    selectedId: string | null;
    isItemSelected: (itemId: string) => boolean;
    handleItemClick: (item: GNBItem) => void;
}

const GNBContext = createContext<GNBContextValue | null>(null);

const useGNBContext = () => {
    const context = useContext(GNBContext);
    if (!context) {
        throw new Error('GNB compound components must be used within GNB.Root');
    }
    return context;
};

// Root Component
interface GNBRootProps {
    children: ReactNode;
    className?: string;
    selectedId?: string;
    onSelect?: (item: GNBItem) => void;
}

const GNBRoot = ({ children, className, selectedId: controlledSelectedId, onSelect }: GNBRootProps) => {
    const { selectedId, isItemSelected, handleItemClick } = useGNB({
        selectedId: controlledSelectedId,
        onSelect,
    });

    return (
        <GNBContext.Provider value={{ selectedId, isItemSelected, handleItemClick }}>
            <nav className={`${styles.gnb} ${className ?? ''}`}>{children}</nav>
        </GNBContext.Provider>
    );
};

// Container Component (for grouping items)
interface GNBContainerProps {
    children: ReactNode;
    className?: string;
    position?: 'top' | 'bottom';
}

const GNBContainer = ({ children, className, position = 'top' }: GNBContainerProps) => {
    const positionClass = position === 'top' ? styles['gnb__container--top'] : styles['gnb__container--bottom'];
    return <div className={`${styles.gnb__container} ${positionClass} ${className ?? ''}`}>{children}</div>;
};

// Item Component
interface GNBItemProps {
    id: string;
    label: string;
    icon: ReactNode;
    onClick?: (item: GNBItem) => void;
    className?: string;
    badge?: ReactNode;
}

const GNBItem = ({ id, label, icon, onClick, className, badge }: GNBItemProps) => {
    const { isItemSelected, handleItemClick } = useGNBContext();
    const isSelected = isItemSelected(id);

    const handleClick = () => {
        const item: GNBItem = { id, label, icon };
        handleItemClick(item);
        onClick?.(item);
    };

    const wrapperClasses = [styles.gnb__item__wrapper, isSelected && styles['gnb__item__wrapper--selected'], className].filter(Boolean).join(' ');

    return (
        <div className={wrapperClasses}>
            <Button variant="ghost" size="icon" className={styles.gnb__item} onClick={handleClick} aria-label={label} aria-current={isSelected ? 'page' : undefined}>
                <span className={styles.gnb__item__icon}>{icon}</span>
                {badge && <span className={styles.gnb__item__badge}>{badge}</span>}
            </Button>
        </div>
    );
};

// Divider Component
interface GNBDividerProps {
    className?: string;
}

const GNBDivider = ({ className }: GNBDividerProps) => {
    return <div className={`${styles.gnb__divider} ${className ?? ''}`} />;
};

// Export compound component
export const GNB = {
    Root: GNBRoot,
    Container: GNBContainer,
    Item: GNBItem,
    Divider: GNBDivider,
};

// Export types
export type { GNBRootProps, GNBContainerProps, GNBItemProps, GNBDividerProps };
