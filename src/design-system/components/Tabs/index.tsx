import { ReactNode, HTMLAttributes } from 'react';
import { TabsContext, useTabs, UseTabsProps, useTabsContext, TabItem, TabDragInfo } from '../../hooks/useTabs';
import styles from './index.module.scss';

// Root Component
export interface TabsRootProps extends UseTabsProps {
    children: ReactNode;
    className?: string;
}

const TabsRoot = ({ children, selectedTab, onTabSelect, onTabClose, className }: TabsRootProps) => {
    const tabsValue = useTabs({ selectedTab, onTabSelect, onTabClose });

    return (
        <TabsContext.Provider value={tabsValue}>
            <div className={[styles.tabs, className].filter(Boolean).join(' ')}>{children}</div>
        </TabsContext.Provider>
    );
};

// Header Component (wraps List and Actions)
export interface TabsHeaderProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
    variant?: 'default' | 'sub';
}

const TabsHeader = ({ children, className, variant = 'default', ...props }: TabsHeaderProps) => {
    return (
        <div
            className={[
                styles.tabs__header,
                variant === 'sub' ? styles['tabs__header--sub'] : '',
                className
            ].filter(Boolean).join(' ')}
            {...props}
        >
            {children}
        </div>
    );
};

// List Component
export interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
    onWheel?: (e: React.WheelEvent<HTMLDivElement>) => void;
}

const TabsList = ({ children, className, onWheel, ...props }: TabsListProps) => {
    return (
        <div className={[styles.tabs__list, className].filter(Boolean).join(' ')} onWheel={onWheel} {...props}>
            {children}
        </div>
    );
};

// Tab Component
export interface TabsTabProps {
    tab: TabItem;
    index: number;
    children: (props: {
        isSelected: boolean;
        isDragOver: boolean;
        dragHandlers: {
            draggable: true;
            onDragStart: () => void;
            onDragEnter: () => void;
            onDragEnd: (e: React.DragEvent) => void;
            onDragOver: (e: React.DragEvent) => void;
            onDragLeave: (e: React.DragEvent) => void;
        };
        onClick: () => void;
        onClose: (e: React.MouseEvent) => void;
        onAuxClick: (e: React.MouseEvent) => void;
    }) => ReactNode;
}

const TabsTab = ({ tab, index, children }: TabsTabProps) => {
    const { selectedTab, setSelectedTab, tabDragInfo, setTabDragInfo, onTabClose } = useTabsContext();

    const isSelected = selectedTab === tab.id;
    const isDragOver = tabDragInfo.over === index && tabDragInfo.start !== index;

    const handleDragStart = () => {
        setSelectedTab(tab);
        setTabDragInfo({ ...tabDragInfo, start: index });
    };

    const handleDragEnter = () => {
        setTabDragInfo({ ...tabDragInfo, enter: index });
    };

    const handleDragEnd = (e: React.DragEvent) => {
        e.stopPropagation();
        setTabDragInfo({ ...tabDragInfo, end: true });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.stopPropagation();
        setTabDragInfo({ ...tabDragInfo, over: index });
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.stopPropagation();
    };

    const handleClick = () => {
        setSelectedTab(tab);
    };

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        onTabClose?.(tab, index);
    };

    const handleAuxClick = (e: React.MouseEvent) => {
        if (e && e.button === 1 && e.type === 'auxclick') {
            e.preventDefault();
            handleClose(e);
        }
    };

    const dragHandlers = {
        draggable: true as const,
        onDragStart: handleDragStart,
        onDragEnter: handleDragEnter,
        onDragEnd: handleDragEnd,
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
    };

    return (
        <>
            {children({
                isSelected,
                isDragOver,
                dragHandlers,
                onClick: handleClick,
                onClose: handleClose,
                onAuxClick: handleAuxClick,
            })}
        </>
    );
};

// Actions Component (for add button, etc)
export interface TabsActionsProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
}

const TabsActions = ({ children, className, ...props }: TabsActionsProps) => {
    return (
        <div className={[styles.tabs__actions, className].filter(Boolean).join(' ')} {...props}>
            {children}
        </div>
    );
};

// Content Component
export interface TabsContentProps {
    children: ReactNode;
    className?: string;
}

const TabsContent = ({ children, className }: TabsContentProps) => {
    return <div className={[styles.tabs__content, className].filter(Boolean).join(' ')}>{children}</div>;
};

// Panel Component
export interface TabsPanelProps {
    tabId: string;
    children: ReactNode;
    className?: string;
}

const TabsPanel = ({ tabId, children, className }: TabsPanelProps) => {
    const { selectedTab } = useTabsContext();
    const isActive = selectedTab === tabId;

    return (
        <div className={[styles.tabs__panel, className].filter(Boolean).join(' ')} style={isActive ? {} : { display: 'none' }}>
            {children}
        </div>
    );
};

// Simple Item wrapper component for modern usage
export interface TabsItemProps {
    value: string;
    children: ReactNode;
    className?: string;
    variant?: 'default' | 'sub';
}

const TabsItem = ({ value, children, className, variant = 'default' }: TabsItemProps) => {
    const tabItem: TabItem = { id: value };
    const index = 0; // Index not needed for simple wrapper

    return (
        <TabsTab tab={tabItem} index={index}>
            {({ isSelected, onClick }) => (
                <button
                    type="button"
                    className={[
                        styles.tabs__item,
                        variant === 'sub' ? styles['tabs__item--sub'] : '',
                        isSelected ? styles['tabs__item--selected'] : '',
                        className,
                    ]
                        .filter(Boolean)
                        .join(' ')}
                    onClick={onClick}
                >
                    <div className={styles['tabs__item-inner']}>
                        {children}
                    </div>
                </button>
            )}
        </TabsTab>
    );
};

export const Tabs = {
    Root: TabsRoot,
    Header: TabsHeader,
    List: TabsList,
    Tab: TabsTab,
    Actions: TabsActions,
    Content: TabsContent,
    Panel: TabsPanel,
    Item: TabsItem,
};

// Export types
export type { TabItem, TabDragInfo };
