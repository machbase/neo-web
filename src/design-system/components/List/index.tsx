import React from 'react';
import { Tooltip } from 'react-tooltip';
import styles from './index.module.scss';

export interface ListItem {
    id: string | number;
    label: React.ReactNode;
    tooltip?: string;
}

export interface ListProps {
    items: ListItem[];
    onItemClick: (itemId: string | number) => void;
    isLoading?: boolean;
    emptyMessage?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    maxHeight?: string | number;
}

const List = React.forwardRef<HTMLDivElement, ListProps>(({ items, onItemClick, isLoading = false, emptyMessage = 'no-data', className, style, maxHeight }, ref) => {
    return (
        <div
            ref={ref}
            className={`${styles['list']} ${styles.list} ${className ?? ''}`}
            style={{
                ...style,
                ...(maxHeight && { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }),
            }}
        >
            {isLoading ? (
                <div className={styles['list__empty']}>Loading...</div>
            ) : items.length > 0 ? (
                <div className={`${styles['list__items']} scrollbar-dark-border`}>
                    {items.map((item) => {
                        const tooltipId = `list-tooltip-${item.id}`;
                        return (
                            <React.Fragment key={item.id}>
                                <button
                                    onClick={() => onItemClick(item.id)}
                                    className={styles['list__item']}
                                    data-tooltip-id={tooltipId}
                                    data-tooltip-content={item.tooltip}
                                >
                                    <div className={styles['list__item-label']}>{item.label}</div>
                                </button>
                                {item.tooltip && (
                                    <Tooltip id={tooltipId} place="top" delayShow={700} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            ) : (
                <div className={styles['list__empty']}>{emptyMessage}</div>
            )}
        </div>
    );
});

List.displayName = 'List';

export default List;
