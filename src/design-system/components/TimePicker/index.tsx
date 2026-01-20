import React, { useRef, useEffect } from 'react';
import styles from './index.module.scss';

export interface TimePickerProps {
    hours: number;
    minutes: number;
    seconds: number;
    onHoursChange: (value: number) => void;
    onMinutesChange: (value: number) => void;
    onSecondsChange: (value: number) => void;
    className?: string;
}

interface TimeColumnProps {
    value: number;
    onChange: (value: number) => void;
    max: number;
    label: string;
}

const TimeColumn: React.FC<TimeColumnProps> = ({ value, onChange, max, label }) => {
    const listRef = useRef<HTMLDivElement>(null);
    const items = Array.from({ length: max }, (_, i) => i);

    // Scroll to selected value when component mounts or value changes
    useEffect(() => {
        if (listRef.current) {
            const itemHeight = 32; // Height of each item
            const scrollPosition = value * itemHeight;
            listRef.current.scrollTop = scrollPosition;
        }
    }, [value]);

    return (
        <div className={styles['time-column']}>
            <div className={styles['time-column__label']}>{label}</div>
            <div ref={listRef} className={`${styles['time-column__list']} scrollbar-dark`}>
                {items.map((item) => (
                    <div
                        key={item}
                        className={`${styles['time-column__item']} ${item === value ? styles['time-column__item--selected'] : ''}`}
                        onClick={() => onChange(item)}
                    >
                        {String(item).padStart(2, '0')}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const TimePicker: React.FC<TimePickerProps> = ({ hours, minutes, seconds, onHoursChange, onMinutesChange, onSecondsChange, className }) => {
    const containerClasses = [styles['time-picker'], className].filter(Boolean).join(' ');

    return (
        <div className={containerClasses}>
            <TimeColumn value={hours} onChange={onHoursChange} max={24} label="Hours" />
            <TimeColumn value={minutes} onChange={onMinutesChange} max={60} label="Minutes" />
            <TimeColumn value={seconds} onChange={onSecondsChange} max={60} label="Seconds" />
        </div>
    );
};

TimePicker.displayName = 'TimePicker';
