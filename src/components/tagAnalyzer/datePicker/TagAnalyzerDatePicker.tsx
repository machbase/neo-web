import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import dayjs, { type Dayjs } from 'dayjs';
import { Calendar } from '@/assets/icons/Icon';
import { Button, Input, TimePicker, Toast } from '@/design-system/components';
import datePickerStyles from '@/design-system/components/DatePicker/index.module.scss';
import {
    createAbsoluteTimeBoundary,
    formatTimeRangeInputValue,
    parseTimeRangeInputValue,
} from '../domain/time/TimeBoundaryInput';

type TagAnalyzerDatePickerProps = {
    label?: string;
    value: string;
    placeholder?: string;
    topPixel?: number;
    autoFocus?: boolean;
    disabled?: boolean;
    className?: string;
    labelPosition?: 'top' | 'left';
    onChange: (value: string) => void;
    onApply: (value: string) => void;
};

type ParsedAbsoluteInput = {
    dateText: string;
    selectedDate: Dayjs;
    hours: number;
    minutes: number;
    seconds: number;
};

const DEFAULT_TOP_PIXEL = 35;
const DEFAULT_PLACEHOLDER = 'YYYY-MM-DD HH:mm:ss';
const MODAL_HEIGHT = 500;
const MODAL_WIDTH = 600;

export default function TagAnalyzerDatePicker({
    label = '',
    value,
    placeholder = DEFAULT_PLACEHOLDER,
    topPixel = DEFAULT_TOP_PIXEL,
    autoFocus = false,
    disabled = false,
    className,
    labelPosition = 'left',
    onChange,
    onApply,
}: TagAnalyzerDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hours, setHours] = useState(0);
    const [minutes, setMinutes] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [dateText, setDateText] = useState('');
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(
        null,
    );
    const inputRef = useRef<HTMLInputElement | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isOpen || !inputRef.current) {
            return;
        }

        const sRect = inputRef.current.getBoundingClientRect();
        let sTop = sRect.bottom + topPixel;
        let sLeft = sRect.left;

        if (sTop + MODAL_HEIGHT > window.innerHeight) {
            sTop = Math.max(16, window.innerHeight - MODAL_HEIGHT - 16);
        }

        if (sLeft + MODAL_WIDTH > window.innerWidth) {
            sLeft = Math.max(16, window.innerWidth - MODAL_WIDTH - 16);
        }

        setPosition({
            top: Math.max(16, sTop),
            left: Math.max(16, sLeft),
        });
    }, [isOpen, topPixel]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handleClickOutside(event: MouseEvent): void {
            if (!modalRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        const sTimer = window.setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            window.clearTimeout(sTimer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handleEscape(event: KeyboardEvent): void {
            if (event.key !== 'Escape') {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            setIsOpen(false);
        }

        document.addEventListener('keydown', handleEscape, true);
        return () => {
            document.removeEventListener('keydown', handleEscape, true);
        };
    }, [isOpen]);

    function openCalendar(): void {
        const sParsedInput = parseAbsoluteInputValue(value);

        if (sParsedInput) {
            setDateText(sParsedInput.dateText);
            setSelectedDate(sParsedInput.selectedDate);
            setHours(sParsedInput.hours);
            setMinutes(sParsedInput.minutes);
            setSeconds(sParsedInput.seconds);
        } else {
            setDateText('');
            setSelectedDate(null);
            setHours(0);
            setMinutes(0);
            setSeconds(0);
        }

        setIsOpen(true);
    }

    function applyCalendarValue(): void {
        if (!dateText) {
            if (isRelativeTimeValue(value)) {
                onApply(value);
                setIsOpen(false);
                return;
            }

            Toast.error('Please select date.');
            return;
        }

        onApply(formatTimeRangeInputValue(createAbsoluteTimeBoundary(
            createTimestampFromDateParts(dateText, hours, minutes, seconds),
        )));
        setIsOpen(false);
    }

    function selectCalendarDate(nextDate: Dayjs | null): void {
        if (!nextDate) {
            return;
        }

        setDateText(formatCalendarDateText(nextDate));
        setSelectedDate(nextDate);
    }

    function handleTextChange(event: ChangeEvent<HTMLInputElement>): void {
        onChange(event.target.value);
    }

    return (
        <div
            className={[
                datePickerStyles['date-picker'],
                className,
            ].filter(Boolean).join(' ')}
        >
            <Input
                label={label}
                labelPosition={labelPosition}
                ref={inputRef}
                value={value}
                onChange={handleTextChange}
                placeholder={placeholder}
                autoFocus={autoFocus}
                disabled={disabled}
                rightIcon={
                    <Button
                        size="icon"
                        variant="ghost"
                        icon={<Calendar />}
                        onClick={openCalendar}
                        disabled={disabled}
                        aria-label="Open date picker"
                        className={datePickerStyles['date-picker__icon-button']}
                    />
                }
            />
            {isOpen && position && (
                <div
                    ref={modalRef}
                    className={datePickerStyles['date-picker__modal']}
                    style={{
                        top: `${position.top}px`,
                        left: `${position.left}px`,
                    }}
                >
                    <div className={datePickerStyles['date-picker__content']}>
                        <div className={datePickerStyles['date-picker__form']}>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DateCalendar
                                    className={datePickerStyles['date-picker__calendar']}
                                    value={selectedDate}
                                    onChange={selectCalendarDate}
                                />
                            </LocalizationProvider>
                            <TimePicker
                                hours={hours}
                                minutes={minutes}
                                seconds={seconds}
                                onHoursChange={setHours}
                                onMinutesChange={setMinutes}
                                onSecondsChange={setSeconds}
                                className={datePickerStyles['date-picker__time']}
                            />
                        </div>
                        <div className={datePickerStyles['date-picker__actions']}>
                            <Button
                                size="md"
                                variant="primary"
                                onClick={applyCalendarValue}
                            >
                                Apply
                            </Button>
                            <Button
                                size="md"
                                variant="secondary"
                                onClick={() => setIsOpen(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function parseAbsoluteInputValue(value: string): ParsedAbsoluteInput | undefined {
    const sBoundary = parseTimeRangeInputValue(value);

    if (sBoundary?.kind !== 'absolute') {
        return undefined;
    }

    const sDate = new Date(sBoundary.timestamp);

    return {
        dateText: formatCalendarDateText(dayjs(sDate)),
        selectedDate: dayjs(sDate),
        hours: sDate.getHours(),
        minutes: sDate.getMinutes(),
        seconds: sDate.getSeconds(),
    };
}

function isRelativeTimeValue(value: string): boolean {
    const sBoundary = parseTimeRangeInputValue(value);

    return sBoundary?.kind === 'now' || sBoundary?.kind === 'last';
}

function createTimestampFromDateParts(
    dateText: string,
    hours: number,
    minutes: number,
    seconds: number,
): number {
    const [year, month, day] = dateText
        .split('-')
        .map((datePart) => Number(datePart));

    return new Date(
        year,
        month - 1,
        day,
        hours,
        minutes,
        seconds,
    ).getTime();
}

function formatCalendarDateText(value: Dayjs): string {
    return [
        value.year(),
        value.month() + 1,
        value.date(),
    ].join('-');
}
