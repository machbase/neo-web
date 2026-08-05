import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import dayjs, { type Dayjs } from 'dayjs';
import { Calendar, VscTrash } from '@/assets/icons/Icon';
import {
    Button,
    Input,
    Modal,
    Page,
    QuickTimeRange,
    TimePicker,
    Toast,
} from '@/design-system/components';
import datePickerStyles from '@/design-system/components/DatePicker/index.module.scss';
import { isFiniteNumber } from '../objectGuards';
import {
    formatAbsoluteTimeExpression,
    isValidTimestampRangeExpression,
    parseAbsoluteTimeExpression,
    resolveEditableTimeRangeInput,
} from './format/timeRangeFormat';
import {
    normalizeNumericRangeInput,
    NUMERIC_RANGE_EXPRESSION_PLACEHOLDER,
    NUMERIC_QUICK_RANGE_OPTIONS,
} from './format/numericRangeFormat';
import {
    formatAxisInputValue,
    getAxisInputPlaceholder,
    parseAxisInputValue,
} from './format/rangeFormat';
import {
    isRangeExpressionEmpty,
    type AxisKind,
    type RangeExpressionInput,
    type AxisRange,
} from './rangeModel';
import { isValidRange } from './rangeArithmetic';
import { TAG_ANALYZER_TIME_RANGE_OPTIONS } from './timeQuickRangeOptions';

type RangeModalMode = (
    | {
          kind: 'numeric-concrete';
          initialRange: AxisRange;
          onApply: (range: AxisRange) => boolean | void;
      }
    | {
          kind: 'numeric-input';
          initialRangeInput: RangeExpressionInput;
          onApply: (rangeInput: RangeExpressionInput) => boolean | void;
      }
    | {
          kind: 'time';
          initialRangeInput: RangeExpressionInput;
          dataStartTime?: number;
          dataEndTime?: number;
          referenceRange?: AxisRange;
          onApply: (rangeInput: RangeExpressionInput, concreteRange: AxisRange) => boolean | void;
      }
) & {
    emptyRange?: boolean;
    onApplyEmpty?: () => boolean | void;
};

type RangeModalProps = {
    title: string;
    mode: RangeModalMode;
    rangeKindSelector?: {
        value: AxisKind;
        onChange: (value: AxisKind) => void;
    };
    onClose: () => void;
};

const TIME_INPUT_PLACEHOLDER = 'YYYY-MM-DD HH:mm:ss';
const EMPTY_RANGE_INPUT_VALUES: RangeExpressionInput = { start: '', end: '' };
const RANGE_KINDS = ['time', 'numeric'] as const;
const RANGE_ENDPOINTS = [
    ['start', 'From'],
    ['end', 'To'],
] as const;

export function RangeModal({ title, mode, rangeKindSelector, onClose }: RangeModalProps) {
    const [rangeInput, setRangeInput] = useState<RangeExpressionInput>(() => {
        if (mode.kind === 'numeric-concrete') {
            return {
                start: formatAxisInputValue(mode.initialRange.startTime, true),
                end: formatAxisInputValue(mode.initialRange.endTime, true),
            };
        }

        return { ...mode.initialRangeInput };
    });

    function setRangeValue(field: keyof RangeExpressionInput, value: string): void {
        setRangeInput((current) => ({ ...current, [field]: value }));
    }

    function handleApply(): void {
        if (
            mode.emptyRange &&
            mode.onApplyEmpty &&
            isRangeExpressionEmpty(rangeInput)
        ) {
            if (mode.onApplyEmpty() !== false) onClose();
            return;
        }

        if (mode.kind === 'time') {
            const sCurrentTime = Date.now();
            const sLastDataTime = isFiniteNumber(mode.dataEndTime)
                ? mode.dataEndTime
                : sCurrentTime;
            const sReferenceRange = mode.referenceRange;
            const sFirstDataTime = isFiniteNumber(mode.dataStartTime)
                ? mode.dataStartTime
                : isValidRange(sReferenceRange)
                  ? sReferenceRange.startTime
                  : sCurrentTime;
            const sResolvedRange = resolveEditableTimeRangeInput({
                startValue: rangeInput.start,
                endValue: rangeInput.end,
                previousConcreteRange: isValidRange(sReferenceRange)
                    ? sReferenceRange
                    : {
                          startTime: sLastDataTime - 1,
                          endTime: sLastDataTime,
                      },
                currentTime: sCurrentTime,
                firstDataTime: sFirstDataTime,
                lastDataTime: sLastDataTime,
            });

            if (
                sResolvedRange.status === 'invalid' ||
                (!mode.emptyRange && sResolvedRange.status !== 'valid')
            ) {
                Toast.error('Please check the entered time.');
                return;
            }

            const sShouldClose = mode.onApply(
                sResolvedRange.rangeInput,
                sResolvedRange.concreteRange,
            );

            if (sShouldClose !== false) {
                onClose();
            }
            return;
        }

        if (mode.kind === 'numeric-input') {
            const sRangeInput = normalizeNumericRangeInput(rangeInput, mode.emptyRange === true);
            if (!sRangeInput) {
                Toast.error('Please enter both numeric boundaries in a valid order.');
                return;
            }

            if (mode.onApply(sRangeInput) !== false) onClose();
            return;
        }

        const sStart = parseAxisInputValue(rangeInput.start, true);
        const sEnd = parseAxisInputValue(rangeInput.end, true);

        if (sStart === undefined || sEnd === undefined) {
            Toast.error('Please enter valid numeric values.');
            return;
        }

        if (sStart >= sEnd) {
            Toast.error('Start must be before end.');
            return;
        }

        const sShouldClose = mode.onApply({
            startTime: sStart,
            endTime: sEnd,
        });
        if (sShouldClose !== false) onClose();
    }

    const sUsesTimeInputs = mode.kind === 'time';
    const sShowsQuickRanges = mode.kind !== 'numeric-concrete';

    return (
        <Modal.Root isOpen onClose={onClose}>
            <Modal.Header>
                <Modal.Title>
                    <Calendar />
                    {title}
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <RangeKindSelector config={rangeKindSelector} />
                {RANGE_ENDPOINTS.map(([field, label]) =>
                    !sUsesTimeInputs ? (
                        <Input
                            key={field}
                            label={label}
                            labelPosition="left"
                            value={rangeInput[field]}
                            placeholder={
                                mode.kind === 'numeric-input'
                                    ? NUMERIC_RANGE_EXPRESSION_PLACEHOLDER
                                    : getAxisInputPlaceholder(true)
                            }
                            onChange={(event) => setRangeValue(field, event.target.value)}
                        />
                    ) : (
                        <TimeExpressionInput
                            key={field}
                            label={label}
                            value={rangeInput[field]}
                            onChange={(value) => setRangeValue(field, value)}
                        />
                    ),
                )}
                {sShowsQuickRanges && (
                    <>
                        <Page.Space />
                        <QuickTimeRange
                            options={
                                sUsesTimeInputs
                                    ? TAG_ANALYZER_TIME_RANGE_OPTIONS
                                    : NUMERIC_QUICK_RANGE_OPTIONS
                            }
                            onSelect={(option) => {
                                const [start = '', end = ''] = option.value;
                                setRangeInput({ start, end });
                            }}
                            title="Quick Range"
                        />
                    </>
                )}
            </Modal.Body>
            <Modal.Footer style={{ justifyContent: 'space-between' }}>
                <Button
                    variant="ghost"
                    size="sm"
                    icon={<VscTrash size={16} />}
                    onClick={() => setRangeInput(EMPTY_RANGE_INPUT_VALUES)}
                >
                    Reset
                </Button>
                <Button.Group>
                    <Modal.Confirm onClick={handleApply}>Apply</Modal.Confirm>
                    <Modal.Cancel>Cancel</Modal.Cancel>
                </Button.Group>
            </Modal.Footer>
        </Modal.Root>
    );
}

function RangeKindSelector({ config }: { config: RangeModalProps['rangeKindSelector'] }) {
    if (!config) return null;

    return (
        <>
            <Button.Group>
                {RANGE_KINDS.map((kind) => (
                    <Button
                        key={kind}
                        size="sm"
                        variant={config.value === kind ? 'secondary' : 'ghost'}
                        aria-pressed={config.value === kind}
                        onClick={() => config.onChange(kind)}
                    >
                        {kind === 'time' ? 'Time' : 'Numeric'}
                    </Button>
                ))}
            </Button.Group>
            <Page.Space />
        </>
    );
}

type TimeExpressionInputProps = {
    label?: string;
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
};

type CalendarSelection = {
    selectedDate: Dayjs | null;
    hours: number;
    minutes: number;
    seconds: number;
};

const EMPTY_CALENDAR_SELECTION: CalendarSelection = {
    selectedDate: null,
    hours: 0,
    minutes: 0,
    seconds: 0,
};

const DATE_PICKER_MODAL_HEIGHT = 500;
const DATE_PICKER_MODAL_WIDTH = 600;
const DATE_PICKER_MODAL_OFFSET = 32;
const DATE_PICKER_VIEWPORT_MARGIN = 16;

export function TimeExpressionInput({
    label = '',
    value,
    placeholder = TIME_INPUT_PLACEHOLDER,
    onChange,
}: TimeExpressionInputProps) {
    const [calendarSelection, setCalendarSelection] = useState(EMPTY_CALENDAR_SELECTION);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const isOpen = position !== null;

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handleClickOutside(event: MouseEvent): void {
            if (!modalRef.current?.contains(event.target as Node)) {
                setPosition(null);
            }
        }

        function handleEscape(event: KeyboardEvent): void {
            if (event.key !== 'Escape') {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            setPosition(null);
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
        const inputElement = inputRef.current;

        if (!inputElement) {
            throw new Error('Cannot open the date picker without its input.');
        }

        const sRect = inputElement.getBoundingClientRect();

        setCalendarSelection(parseAbsoluteInputValue(value) ?? EMPTY_CALENDAR_SELECTION);
        setPosition({
            top: clampToViewport(
                sRect.bottom + DATE_PICKER_MODAL_OFFSET,
                DATE_PICKER_MODAL_HEIGHT,
                window.innerHeight,
            ),
            left: clampToViewport(sRect.left, DATE_PICKER_MODAL_WIDTH, window.innerWidth),
        });
    }

    function applyCalendarValue(): void {
        const sSelectedDate = calendarSelection.selectedDate;

        if (!sSelectedDate) {
            if (value.trim() !== '' && isValidTimestampRangeExpression(value)) {
                onChange(value);
                setPosition(null);
                return;
            }

            Toast.error('Please select date.');
            return;
        }

        onChange(
            formatAbsoluteTimeExpression(
                new Date(
                    sSelectedDate.year(),
                    sSelectedDate.month(),
                    sSelectedDate.date(),
                    calendarSelection.hours,
                    calendarSelection.minutes,
                    calendarSelection.seconds,
                ).getTime(),
            ),
        );
        setPosition(null);
    }

    function selectCalendarDate(nextDate: Dayjs | null): void {
        if (!nextDate) {
            return;
        }

        setCalendarSelection((previous) => ({
            ...previous,
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

    return (
        <div className={datePickerStyles['date-picker']}>
            <Input
                label={label}
                labelPosition="left"
                ref={inputRef}
                value={value}
                onChange={(event) => onChange(event.target.value)}
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
            {position && createPortal(
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
                            <Button size="md" variant="primary" onClick={applyCalendarValue}>
                                Apply
                            </Button>
                            <Button size="md" variant="secondary" onClick={() => setPosition(null)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}

function clampToViewport(value: number, size: number, viewportSize: number): number {
    return Math.max(
        DATE_PICKER_VIEWPORT_MARGIN,
        Math.min(value, viewportSize - size - DATE_PICKER_VIEWPORT_MARGIN),
    );
}

function parseAbsoluteInputValue(value: string): CalendarSelection | undefined {
    const sTimestamp = parseAbsoluteTimeExpression(value);

    if (sTimestamp === undefined) {
        return undefined;
    }

    const sDate = dayjs(sTimestamp);

    return {
        selectedDate: sDate,
        hours: sDate.hour(),
        minutes: sDate.minute(),
        seconds: sDate.second(),
    };
}
