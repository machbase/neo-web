import React from 'react';
import styles from './index.module.scss';

export interface QuickTimeRangeOption {
    key: number | string;
    name: string;
    value: string[];
}

export interface QuickTimeRangeProps {
    options: QuickTimeRangeOption[][];
    onSelect: (option: QuickTimeRangeOption) => void;
    title?: string;
    className?: string;
}

/**
 * QuickTimeRange Component
 *
 * Display quick time range selection buttons in a grid layout
 *
 * @example
 * ```tsx
 * const timeRanges = [
 *   [
 *     { key: 1, name: 'Last 5 seconds', value: ['now-5s', 'now'] },
 *     { key: 2, name: 'Last 10 seconds', value: ['now-10s', 'now'] },
 *   ],
 *   [
 *     { key: 3, name: 'Last 5 minutes', value: ['now-5m', 'now'] },
 *     { key: 4, name: 'Last 10 minutes', value: ['now-10m', 'now'] },
 *   ]
 * ];
 *
 * <QuickTimeRange
 *   options={timeRanges}
 *   onSelect={(option) => console.log(option)}
 *   title="Quick Range"
 * />
 * ```
 */
export const QuickTimeRange: React.FC<QuickTimeRangeProps> = ({ options, onSelect, title = 'Quick Range', className }) => {
    return (
        <div className={`${styles['quick-time-range']} ${className ?? ''}`}>
            {title && <div className={styles['quick-time-range__title']}>{title}</div>}
            <div className={styles['quick-time-range__grid']}>
                {options.map((group, groupIdx) => (
                    <div key={groupIdx} className={styles['quick-time-range__group']}>
                        {group.map((option) => (
                            <button key={option.key} className={styles['quick-time-range__button']} onClick={() => onSelect(option)} type="button">
                                {option.name}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};
