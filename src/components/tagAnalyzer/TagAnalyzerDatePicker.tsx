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

type CalendarSelection = {
    dateText: string;
    selectedDate: Dayjs | null;
    hours: number;
    minutes: number;
    seconds: number;
};

const EMPTY_CALENDAR_SELECTION: CalendarSelection = {
    dateText: '',
    selectedDate: null,
    hours: 0,
    minutes: 0,
    seconds: 0,
};

const DEFAULT_PLACEHOLDER = 'YYYY-MM-DD HH:mm:ss';
const MODAL_HEIGHT = 500;
const MODAL_WIDTH = 600;
const MODAL_OFFSET = 32;
const VIEWPORT_MARGIN = 16;

export default function TagAnalyzerDatePicker({
    label = '',
    value,
    placeholder = DEFAULT_PLACEHOLDER,
    placement = 'bottom',
    onChange,
    onApply,
}: TagAnalyzerDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [calendarSelection, setCalendarSelection] = useState(EMPTY_CALENDAR_SELECTION);
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

        setPosition({
            top: clampToViewport(
                getModalTopPosition(sRect, placement),
                MODAL_HEIGHT,
                window.innerHeight,
            ),
            left: clampToViewport(sRect.left, MODAL_WIDTH, window.innerWidth),
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

        function handleEscape(event: KeyboardEvent): void {
            if (event.key !== 'Escape') {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            setIsOpen(false);
        }

        // Delay so the click that opened the modal cannot immediately close it
        const sTimer = window.setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);
        // Capture phase so ESC closes the picker before a parent modal
        document.addEventListener('keydown', handleEscape, true);

        return () => {
            window.clearTimeout(sTimer);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape, true);
        };
    }, [isOpen]);

    function openCalendar(): void {
        setCalendarSelection(
            parseAbsoluteInputValue(value) ?? EMPTY_CALENDAR_SELECTION,
        );
        setIsOpen(true);
    }

    function applyCalendarValue(): void {
        if (!calendarSelection.dateText) {
            if (isResolvableTimeValue(value)) {
                onApply(value);
                setIsOpen(false);
                return;
            }

            Toast.error('Please select date.');
            return;
        }

        onApply(formatAbsoluteTimeExpression(
            createTimestampFromDateParts(calendarSelection),
        ));
        setIsOpen(false);
    }

    function selectCalendarDate(nextDate: Dayjs | null): void {
        if (!nextDate) {
            return;
        }

        setCalendarSelection((previous) => ({
            ...previous,
            dateText: formatCalendarDateText(nextDate),
            selectedDate: nextDate,
        }));
    }

    function selectTimePart(part: 'hours' | 'minutes' | 'seconds') {
        return (nextValue: number) =>
            setCalendarSelection((previous) => ({
                ...previous,
                [part]: nextValue,
            }));
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
                                    value={calendarSelection.selectedDate}
                                    onChange={selectCalendarDate}
                                />
                            </LocalizationProvider>
                            <TimePicker
                                hours={calendarSelection.hours}
                                minutes={calendarSelection.minutes}
                                seconds={calendarSelection.seconds}
                                onHoursChange={selectTimePart('hours')}
                                onMinutesChange={selectTimePart('minutes')}
                                onSecondsChange={selectTimePart('seconds')}
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

function clampToViewport(value: number, size: number, viewportSize: number): number {
    return Math.max(
        VIEWPORT_MARGIN,
        Math.min(value, viewportSize - size - VIEWPORT_MARGIN),
    );
}

function parseAbsoluteInputValue(value: string): CalendarSelection | undefined {
    const sTimestamp = parseAbsoluteTimeExpression(value);

    if (sTimestamp === undefined) {
        return undefined;
    }

    const sDate = dayjs(sTimestamp);

    return {
        dateText: formatCalendarDateText(sDate),
        selectedDate: sDate,
        hours: sDate.hour(),
        minutes: sDate.minute(),
        seconds: sDate.second(),
    };
}

function isResolvableTimeValue(value: string): boolean {
    const sAnchorTime = Date.now();

    return canResolveTimeStringToTimestamp(value, {
        currentTime: sAnchorTime,
        lastDataTime: sAnchorTime,
    });
}

function createTimestampFromDateParts(selection: CalendarSelection): number {
    const [year, month, day] = selection.dateText
        .split('-')
        .map((datePart) => Number(datePart));

    return new Date(
        year,
        month - 1,
        day,
        selection.hours,
        selection.minutes,
        selection.seconds,
    ).getTime();
}

function formatCalendarDateText(value: Dayjs): string {
    return [
        value.year(),
        value.month() + 1,
        value.date(),
    ].join('-');
}
