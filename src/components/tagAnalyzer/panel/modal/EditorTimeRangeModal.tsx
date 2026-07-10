import { useMemo, useState, type KeyboardEvent } from 'react';
import { VscTrash } from '@/assets/icons/Icon';
import {
    Button,
    Input,
    QuickTimeRange,
    type ContextMenuPosition,
    type QuickTimeRangeOption,
} from '@/design-system/components';
import { TIME_RANGE } from '@/utils/constants';
import TagAnalyzerDatePicker from '../../TagAnalyzerDatePicker';
import {
    formatNumericRangeExpression,
    isEmptyPanelRangeInput,
    isPanelRangeExpressionValidForAxis,
    isValidNumericRangeExpressionPair,
    parseNumericRangeExpression,
} from '../../domain/panelRange/PanelRangeInput';
import {
    resolveEditableTimeRangeInput,
} from '../../domain/time/TimeRangeInputParsing';
import { formatAbsoluteTimeExpression } from '../../domain/time/TimeRangeInputResolver';
import type { TimeRangeInput, TimeRangeMs } from '../../domain/time/TimeTypes';
import { createTimeRangeMs, isValidTimeRange } from '../../domain/time/TimeRangeUtils';
import PanelPopover from './PanelPopover';

export type ApplyEditorTimeRangeInput = (start: string, end: string) => void;

export type EditorTimeRangeModalRequest = {
    position: ContextMenuPosition;
    chartTitle: string;
    isNumericXAxis: boolean;
    rangeInput: TimeRangeInput;
    panelRange: TimeRangeMs;
    onApplyRangeInput: ApplyEditorTimeRangeInput;
};

export type OpenEditorTimeRangeModal = (
    request: Omit<EditorTimeRangeModalRequest, 'position'>,
) => void;

type NumericInputValues = {
    startValue: string;
    endValue: string;
};

const DEFAULT_TIME_INPUT_PLACEHOLDER = 'YYYY-MM-DD HH:mm:ss';
const NUMERIC_BOUNDARY_INPUT_PLACEHOLDER = '20, first, first-10, last-10';
const DEFAULT_NUMERIC_INPUT_VALUES: NumericInputValues = {
    startValue: '',
    endValue: '',
};
const NUMERIC_QUICK_RANGE: QuickTimeRangeOption[][] = [
    [
        { key: 'first-10', name: 'First 10', value: ['first', 'first-10'] },
        { key: 'first-100', name: 'First 100', value: ['first', 'first-100'] },
        { key: 'first-1000', name: 'First 1000', value: ['first', 'first-1000'] },
        { key: 'first-10000', name: 'First 10k', value: ['first', 'first-10000'] },
        { key: 'first-100000', name: 'First 100k', value: ['first', 'first-100000'] },
        { key: 'first-1000000', name: 'First 1m', value: ['first', 'first-1000000'] },
        { key: 'first-10000000', name: 'First 10m', value: ['first', 'first-10000000'] },
    ],
    [
        { key: 'last-10', name: 'Last 10', value: ['last-10', 'last'] },
        { key: 'last-100', name: 'Last 100', value: ['last-100', 'last'] },
        { key: 'last-1000', name: 'Last 1000', value: ['last-1000', 'last'] },
        { key: 'last-10000', name: 'Last 10k', value: ['last-10000', 'last'] },
        { key: 'last-100000', name: 'Last 100k', value: ['last-100000', 'last'] },
        { key: 'last-1000000', name: 'Last 1m', value: ['last-1000000', 'last'] },
        { key: 'last-10000000', name: 'Last 10m', value: ['last-10000000', 'last'] },
    ],
];

export function EditorTimeRangeModal({
    request,
    onClose,
}: {
    request: EditorTimeRangeModalRequest;
    onClose: () => void;
}) {
    if (request.isNumericXAxis) {
        return (
            <NumericConfiguredRangeModal
                request={request}
                onClose={onClose}
            />
        );
    }

    return (
        <TimestampConfiguredRangeModal
            request={request}
            onClose={onClose}
        />
    );
}

function TimestampConfiguredRangeModal({
    request,
    onClose,
}: {
    request: EditorTimeRangeModalRequest;
    onClose: () => void;
}) {
    const sRangeInput = useMemo(
        () => getTimestampRangeInput(request.rangeInput),
        [request.rangeInput],
    );
    const sInputValues = getTimestampInputValues(
        sRangeInput,
        request.panelRange,
    );
    const [startTime, setStartTime] = useState(sInputValues.startTime);
    const [endTime, setEndTime] = useState(sInputValues.endTime);
    const validation = validateTimestampInputPair(
        startTime,
        endTime,
        request.panelRange,
    );

    function applyTimeRange(): void {
        if (!validation.rangeInput) {
            return;
        }

        request.onApplyRangeInput(
            validation.rangeInput.start,
            validation.rangeInput.end,
        );
        onClose();
    }

    function handleQuickTime(option: QuickTimeRangeOption): void {
        setStartTime(String(option.value[0] ?? ''));
        setEndTime(String(option.value[1] ?? ''));
    }

    function clearTimeRange(): void {
        setStartTime('');
        setEndTime('');
    }

    return (
        <PanelPopover
            title={getPanelConfiguredRangeTitle(
                request.chartTitle,
                request.isNumericXAxis,
            )}
            position={request.position}
            onClose={onClose}
            draggable
            closeOnScroll={false}
            size="wide"
            actions={(
                <>
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<VscTrash size={16} />}
                        onClick={clearTimeRange}
                    >
                        Clear
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        disabled={!validation.rangeInput}
                        onClick={applyTimeRange}
                    >
                        Apply
                    </Button>
                </>
            )}
        >
            <div className="panel-popover-form__configured-range">
                <div className="panel-popover-form__row panel-popover-form__range-input-row panel-popover-form__configured-range-inputs">
                    <TagAnalyzerDatePicker
                        label="From"
                        placement="bottom"
                        value={startTime}
                        placeholder={sInputValues.startPlaceholder}
                        onChange={setStartTime}
                        onApply={setStartTime}
                    />
                    <TagAnalyzerDatePicker
                        label="To"
                        placement="bottom"
                        value={endTime}
                        placeholder={sInputValues.endPlaceholder}
                        onChange={setEndTime}
                        onApply={setEndTime}
                    />
                </div>
                {validation.message ? (
                    <span className="panel-popover-form__field-error">
                        {validation.message}
                    </span>
                ) : null}
                <QuickTimeRange
                    className="panel-popover-form__quick-range panel-popover-form__configured-quick-range"
                    options={TIME_RANGE}
                    onSelect={handleQuickTime}
                    title="Quick Range"
                />
            </div>
        </PanelPopover>
    );
}

function NumericConfiguredRangeModal({
    request,
    onClose,
}: {
    request: EditorTimeRangeModalRequest;
    onClose: () => void;
}) {
    const sRangeInput = useMemo(
        () => getNumericRangeInput(request.rangeInput),
        [request.rangeInput],
    );
    const [inputValues, setInputValues] = useState(
        () => getNumericInputValues(sRangeInput),
    );
    const validation = validateNumericInputPair(
        inputValues.startValue,
        inputValues.endValue,
    );

    function setNumericInput(
        field: keyof NumericInputValues,
        value: string,
    ): void {
        setInputValues((previous) => ({
            ...previous,
            [field]: value,
        }));
    }

    function applyNumericRange(): void {
        if (!validation.rangeInput) {
            return;
        }

        request.onApplyRangeInput(
            validation.rangeInput.start,
            validation.rangeInput.end,
        );
        onClose();
    }

    function handleQuickNumericRange(option: QuickTimeRangeOption): void {
        const [startValue = '', endValue = ''] = option.value;

        setInputValues({
            startValue,
            endValue,
        });
    }

    function clearNumericRange(): void {
        setInputValues(DEFAULT_NUMERIC_INPUT_VALUES);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        if (event.key === 'Enter') {
            applyNumericRange();
        }
    }

    return (
        <PanelPopover
            title={getPanelConfiguredRangeTitle(
                request.chartTitle,
                request.isNumericXAxis,
            )}
            position={request.position}
            onClose={onClose}
            draggable
            closeOnScroll={false}
            size="wide"
            actions={(
                <>
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<VscTrash size={16} />}
                        onClick={clearNumericRange}
                    >
                        Clear
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        disabled={!validation.rangeInput}
                        onClick={applyNumericRange}
                    >
                        Apply
                    </Button>
                </>
            )}
        >
            <div className="panel-popover-form__configured-range">
                <div className="panel-popover-form__row panel-popover-form__range-input-row panel-popover-form__configured-range-inputs">
                    <Input
                        label="From"
                        labelPosition="left"
                        value={inputValues.startValue}
                        placeholder={NUMERIC_BOUNDARY_INPUT_PLACEHOLDER}
                        onChange={(event) =>
                            setNumericInput('startValue', event.target.value)
                        }
                        onKeyDown={handleKeyDown}
                    />
                    <Input
                        label="To"
                        labelPosition="left"
                        value={inputValues.endValue}
                        placeholder={NUMERIC_BOUNDARY_INPUT_PLACEHOLDER}
                        onChange={(event) =>
                            setNumericInput('endValue', event.target.value)
                        }
                        onKeyDown={handleKeyDown}
                    />
                </div>
                {validation.message ? (
                    <span className="panel-popover-form__field-error">
                        {validation.message}
                    </span>
                ) : null}
                <QuickTimeRange
                    className="panel-popover-form__quick-range panel-popover-form__configured-quick-range"
                    options={NUMERIC_QUICK_RANGE}
                    onSelect={handleQuickNumericRange}
                    title="Quick Range"
                />
            </div>
        </PanelPopover>
    );
}

function validateTimestampInputPair(
    startTime: string,
    endTime: string,
    panelRange: TimeRangeMs,
): { rangeInput: TimeRangeInput | undefined; message?: string } {
    const sCurrentTime = Date.now();
    const sResolvedRange = resolveEditableTimeRangeInput({
        startValue: startTime,
        endValue: endTime,
        previousConcreteRange: getTimestampConcreteRange(
            panelRange,
            sCurrentTime,
        ),
        currentTime: sCurrentTime,
        lastDataTime: getTimestampLastDataTime(panelRange, sCurrentTime),
    });

    return sResolvedRange.status === 'invalid'
        ? {
              rangeInput: undefined,
              message: 'Enter both range boundaries in a valid order.',
          }
        : { rangeInput: sResolvedRange.rangeInput };
}

function validateNumericInputPair(
    startValue: string,
    endValue: string,
): { rangeInput: TimeRangeInput | undefined; message?: string } {
    const sRangeInput = createNumericRangeInputFromValues(
        startValue,
        endValue,
    );

    return sRangeInput
        ? { rangeInput: sRangeInput }
        : {
              rangeInput: undefined,
              message: 'Enter both value boundaries in a valid order.',
          };
}

function createNumericRangeInputFromValues(
    startValue: string,
    endValue: string,
): TimeRangeInput | undefined {
    const sStartValue = startValue.trim();
    const sEndValue = endValue.trim();

    if (sStartValue === '' && sEndValue === '') {
        return { start: '', end: '' };
    }

    const sStartParsed = parseNumericRangeExpression(sStartValue);
    const sEndParsed = parseNumericRangeExpression(sEndValue);

    if (
        !sStartParsed ||
        !sEndParsed ||
        !isValidNumericRangeExpressionPair(sStartParsed, sEndParsed)
    ) {
        return undefined;
    }

    return {
        start: formatNumericRangeExpression(sStartParsed),
        end: formatNumericRangeExpression(sEndParsed),
    };
}

function getTimestampRangeInput(
    rangeInput: TimeRangeInput,
): TimeRangeInput {
    return {
        start: sanitizeExpressionForAxis(rangeInput.start, false),
        end: sanitizeExpressionForAxis(rangeInput.end, false),
    };
}

function getNumericRangeInput(
    rangeInput: TimeRangeInput,
): TimeRangeInput {
    return {
        start: sanitizeExpressionForAxis(rangeInput.start, true),
        end: sanitizeExpressionForAxis(rangeInput.end, true),
    };
}

function sanitizeExpressionForAxis(
    value: string,
    isNumericAxis: boolean,
): string {
    return isPanelRangeExpressionValidForAxis(value, isNumericAxis) ? value : '';
}

function getTimestampInputValues(
    rangeInput: TimeRangeInput,
    panelRange: TimeRangeMs,
) {
    const sIsEmptyTimeRange = isEmptyPanelRangeInput(rangeInput);

    return {
        startTime: rangeInput.start,
        endTime: rangeInput.end,
        startPlaceholder: sIsEmptyTimeRange && isValidTimeRange(panelRange)
            ? formatAbsoluteTimeExpression(panelRange.startTime)
            : DEFAULT_TIME_INPUT_PLACEHOLDER,
        endPlaceholder: sIsEmptyTimeRange && isValidTimeRange(panelRange)
            ? formatAbsoluteTimeExpression(panelRange.endTime)
            : DEFAULT_TIME_INPUT_PLACEHOLDER,
    };
}

function getNumericInputValues(
    rangeInput: TimeRangeInput,
): NumericInputValues {
    return {
        startValue: rangeInput.start,
        endValue: rangeInput.end,
    };
}

function getTimestampConcreteRange(
    panelRange: TimeRangeMs,
    currentTime: number,
): TimeRangeMs {
    return isValidTimeRange(panelRange)
        ? panelRange
        : createTimeRangeMs(currentTime - 1, currentTime);
}

function getPanelRangeAxisLabel(isNumericXAxis: boolean): string {
    return isNumericXAxis ? 'Numeric' : 'Time';
}

function getPanelConfiguredRangeTitle(
    chartTitle: string,
    isNumericXAxis: boolean,
): string {
    const sChartTitle = chartTitle.trim();
    const sBaseTitle = `Panel configured range (${getPanelRangeAxisLabel(isNumericXAxis)})`;

    return sChartTitle ? `${sBaseTitle} - ${sChartTitle}` : sBaseTitle;
}

function getTimestampLastDataTime(
    panelRange: TimeRangeMs,
    currentTime: number,
): number {
    return isValidTimeRange(panelRange) ? panelRange.endTime : currentTime;
}
