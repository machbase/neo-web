import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import dayjs, { type Dayjs } from 'dayjs';
import { Calendar } from '@/assets/icons/Icon';
import { Button, Input, TimePicker, Toast } from '@/design-system/components';
import datePickerStyles from '@/design-system/components/DatePicker/index.module.scss';
import {
    canResolveTimeStringToTimestamp,
    formatAbsoluteTimeExpression,
    parseAbsoluteTimeExpression,
} from './domain/time/TimeRangeInputResolver';

type TagAnalyzerDatePickerProps = {
    label?: string;
    value: string;
    placeholder?: string;
    placement?: 'top' | 'bottom';
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

const DEFAULT_PLACEHOLDER = 'YYYY-MM-DD HH:mm:ss';
const MODAL_HEIGHT = 500;
const MODAL_WIDTH = 600;
const MODAL_OFFSET = 32;

export default function TagAnalyzerDatePicker({
    label = '',
    value,
    placeholder = DEFAULT_PLACEHOLDER,
    placement = 'bottom',
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
        let sTop = getModalTopPosition(sRect, placement);
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
    }, [isOpen, placement]);

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
            if (isResolvableTimeValue(value)) {
                onApply(value);
                setIsOpen(false);
                return;
            }

            Toast.error('Please select date.');
            return;
        }

        onApply(formatAbsoluteTimeExpression(
            createTimestampFromDateParts(dateText, hours, minutes, seconds),
        ));
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
        <div className={datePickerStyles['date-picker']}>
            <Input
                label={label}
                labelPosition="left"
                ref={inputRef}
                value={value}
                onChange={handleTextChange}
                placeholder={placeholder}
                rightIcon={
                    <Button
                        size="icon"
                        variant="ghost"
                        icon={<Calendar />}
                        onClick={openCalendar}
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


function getModalTopPosition(
    anchorRect: DOMRect,
    placement: TagAnalyzerDatePickerProps['placement'],
): number {
    if (placement === 'top') {
        return anchorRect.top - MODAL_HEIGHT - MODAL_OFFSET;
    }

    return anchorRect.bottom + MODAL_OFFSET;
}
function parseAbsoluteInputValue(value: string): ParsedAbsoluteInput | undefined {
    const sTimestamp = parseAbsoluteTimeExpression(value);

    if (sTimestamp === undefined) {
        return undefined;
    }

    const sDate = new Date(sTimestamp);

    return {
        dateText: formatCalendarDateText(dayjs(sDate)),
        selectedDate: dayjs(sDate),
        hours: sDate.getHours(),
        minutes: sDate.getMinutes(),
        seconds: sDate.getSeconds(),
    };
}

function isResolvableTimeValue(value: string): boolean {
    const sAnchorTime = Date.now();

    return canResolveTimeStringToTimestamp(value, {
        currentTime: sAnchorTime,
        lastDataTime: sAnchorTime,
    });
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
