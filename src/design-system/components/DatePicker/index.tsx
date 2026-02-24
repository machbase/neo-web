import React, { useState, useRef, useEffect } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { Dayjs } from 'dayjs';
import moment from 'moment';
import { Button } from '../Button';
import { Calendar } from '@/assets/icons/Icon';
import { Toast } from '@/design-system/components';
import styles from './index.module.scss';
import { Input } from '../Input';
import { TimePicker } from '../TimePicker';

export interface DatePickerProps {
    pTimeValue?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    pSetApply?: (formattedDate: string) => void;
    pTopPixel?: number;
    pAutoFocus?: boolean;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
    pLabel?: string;
    labelPosition?: 'top' | 'left';
}

export const DatePicker = ({
    pTimeValue = '',
    onChange,
    pSetApply,
    pTopPixel = 35,
    pAutoFocus = false,
    disabled = false,
    placeholder = 'YYYY-MM-DD HH:mm:ss',
    className,
    pLabel = '',
    labelPosition = 'left',
}: DatePickerProps) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [hours, setHours] = useState<number>(0);
    const [minute, setMinute] = useState<number>(0);
    const [second, setSecond] = useState<number>(0);
    const [date, setDate] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const handleApply = () => {
        // If user selected a date from calendar, convert to formatted string
        if (date) {
            const listDate = new Date(`${date} ${hours}:${minute}:${second}`).getTime();
            const formattedDate = moment(listDate).format('YYYY-MM-DD HH:mm:ss');

            if (pSetApply) {
                pSetApply(formattedDate);
            }
            setIsOpen(false);
            return;
        }

        // If no date selected, preserve special time values (now, last) or show error
        const currentValue = pTimeValue || '';
        const isSpecialValue = typeof currentValue === 'string' && (currentValue.includes('now') || currentValue.includes('last'));

        if (isSpecialValue) {
            if (pSetApply) {
                pSetApply(currentValue);
            }
            setIsOpen(false);
            return;
        }

        // No date selected and no special value
        Toast.error('Please select date.');
    };

    const handleCancel = () => {
        setIsOpen(false);
    };

    // Calculate modal position when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            const modalHeight = 500; // Approximate modal height
            const modalWidth = 600; // Approximate modal width

            let top = rect.bottom + pTopPixel;
            let left = rect.left;

            // Adjust if modal goes beyond viewport bottom
            if (top + modalHeight > window.innerHeight) {
                top = Math.max(16, window.innerHeight - modalHeight - 16);
            }

            // Adjust if modal goes beyond viewport right
            if (left + modalWidth > window.innerWidth) {
                left = Math.max(16, window.innerWidth - modalWidth - 16);
            }

            // Ensure modal doesn't go beyond viewport top
            top = Math.max(16, top);

            // Ensure modal doesn't go beyond viewport left
            left = Math.max(16, left);

            setPosition({
                top,
                left,
            });
        }
    }, [isOpen, pTopPixel]);

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isOpen && modalRef.current && !modalRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            // Add slight delay to avoid closing immediately after opening
            const timer = setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 0);

            return () => {
                clearTimeout(timer);
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOpen]);

    // Handle ESC key with event propagation stop to prevent Modal from closing
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                setIsOpen(false);
            }
        };

        if (isOpen) {
            // Use capture phase to catch event before Modal
            document.addEventListener('keydown', handleEsc, true);
            return () => {
                document.removeEventListener('keydown', handleEsc, true);
            };
        }
    }, [isOpen]);

    const wrapperClasses = [styles['date-picker'], className].filter(Boolean).join(' ');

    // Check if current value is a special time value (now, last)
    const isSpecialValue = typeof pTimeValue === 'string' && (pTimeValue.includes('now') || pTimeValue.includes('last'));

    const handleCalendarOpen = () => {
        // Clear special values when opening calendar to select a date
        if (isSpecialValue) {
            setDate('');
            setSelectedDate(null);
            setHours(0);
            setMinute(0);
            setSecond(0);
        }
        setIsOpen(true);
    };

    return (
        <div ref={wrapperRef} className={wrapperClasses}>
            <Input
                label={pLabel}
                labelPosition={labelPosition}
                ref={inputRef}
                value={pTimeValue}
                onChange={onChange}
                placeholder={placeholder}
                autoFocus={pAutoFocus}
                disabled={disabled}
                rightIcon={
                    <Button
                        size="icon"
                        variant="ghost"
                        icon={<Calendar />}
                        onClick={handleCalendarOpen}
                        disabled={disabled}
                        aria-label="Open date picker"
                        title={isSpecialValue ? "Opening calendar will clear the current special value" : undefined}
                        className={styles['date-picker__icon-button']}
                    />
                }
            />
            {isOpen && position && inputRef.current && (
                <div
                    ref={modalRef}
                    className={styles['date-picker__modal']}
                    style={{
                        top: `${position.top}px`,
                        left: `${position.left}px`,
                    }}
                >
                    <div className={styles['date-picker__content']}>
                        <div className={styles['date-picker__form']}>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DateCalendar
                                    className={styles['date-picker__calendar']}
                                    value={selectedDate}
                                    onChange={(value: any) => {
                                        setDate(`${value.$y}-${value.$M + 1}-${value.$D}`);
                                        setSelectedDate(value);
                                    }}
                                />
                            </LocalizationProvider>
                            <TimePicker
                                hours={hours}
                                minutes={minute}
                                seconds={second}
                                onHoursChange={setHours}
                                onMinutesChange={setMinute}
                                onSecondsChange={setSecond}
                                className={styles['date-picker__time']}
                            />
                        </div>
                        <div className={styles['date-picker__actions']}>
                            <Button size="md" variant="primary" onClick={handleApply}>
                                Apply
                            </Button>
                            <Button size="md" variant="secondary" onClick={handleCancel}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

DatePicker.displayName = 'DatePicker';
