import { useEffect, useMemo, useState } from 'react';
import { Button, Input, QuickTimeRange } from '@/design-system/components';
import type { QuickTimeRangeOption } from '@/design-system/components/QuickTimeRange';
import { VscTrash } from '@/assets/icons/Icon';
import { TIME_RANGE } from '@/utils/constants';
import TagAnalyzerDatePicker from '../../../TagAnalyzerDatePicker';
import type { PanelInfo } from '../../../domain/panel/PanelConfig';
import styles from '../PanelEditor.module.scss';
import { resolveEditableTimeRangeInput } from '../../../parsing/TimeRangeInputParsing';
import {
    type PanelRangeInput,
    type TimeRangeInput,
    type TimeRangeMs,
} from '../../../domain/time/TimeTypes';
import {
    formatNumericRangeExpression,
    isEmptyPanelRangeInput,
    isPanelRangeExpressionValidForAxis,
    isValidNumericRangeExpressionPair,
    parseNumericRangeExpression,
} from '../../../domain/panelRange/PanelRangeInput';
import {
    createTimeRangeMs,
    isValidTimeRange,
} from '../../../domain/time/TimeRangeUtils';
import { formatAbsoluteTimeExpression } from '../../../domain/time/TimeRangeInputResolver';

type TimeInputField = 'start' | 'end';
type TimestampInputValues = {
    startTime: string;
    endTime: string;
    startPlaceholder: string;
    endPlaceholder: string;
};
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
        { key: 'last-10', name: 'Last 10', value: ['last-10', 'last'] },
    ],
    [
        { key: 'first-100', name: 'First 100', value: ['first', 'first-100'] },
        { key: 'last-100', name: 'Last 100', value: ['last-100', 'last'] },
    ],
    [
        { key: 'first-1000', name: 'First 1000', value: ['first', 'first-1000'] },
        { key: 'last-1000', name: 'Last 1000', value: ['last-1000', 'last'] },
    ],
];

const EditorTimeTab = ({
    pTimeConfig,
    pIsNumericXAxis,
    pPanelRange,
    pOnChangeTimeConfig,
    pOnInvalidTimeInputChange,
}: {
    pTimeConfig: PanelInfo['time'];
    pIsNumericXAxis: boolean;
    pPanelRange: TimeRangeMs;
    pOnChangeTimeConfig: (config: PanelInfo['time']) => void;
    pOnInvalidTimeInputChange: (hasInvalidTimeInput: boolean) => void;
}) => {
    if (pIsNumericXAxis) {
        return (
            <NumericRangeInputEditor
                pTimeConfig={pTimeConfig}
                pOnChangeTimeConfig={pOnChangeTimeConfig}
                pOnInvalidTimeInputChange={pOnInvalidTimeInputChange}
            />
        );
    }

    return (
        <TimestampRangeInputEditor
            pTimeConfig={pTimeConfig}
            pPanelRange={pPanelRange}
            pOnChangeTimeConfig={pOnChangeTimeConfig}
            pOnInvalidTimeInputChange={pOnInvalidTimeInputChange}
        />
    );
};

function TimestampRangeInputEditor({
    pTimeConfig,
    pPanelRange,
    pOnChangeTimeConfig,
    pOnInvalidTimeInputChange,
}: {
    pTimeConfig: PanelInfo['time'];
    pPanelRange: TimeRangeMs;
    pOnChangeTimeConfig: (config: PanelInfo['time']) => void;
    pOnInvalidTimeInputChange: (hasInvalidTimeInput: boolean) => void;
}) {
    const sRangeInput = useMemo(
        () => getTimestampRangeInput(pTimeConfig.rangeInput),
        [pTimeConfig],
    );
    const sInitialInputValues = getTimestampInputValues(
        sRangeInput,
        pPanelRange,
    );
    const [sStartTime, setStartTime] = useState(sInitialInputValues.startTime);
    const [sEndTime, setEndTime] = useState(sInitialInputValues.endTime);
    const sInputValues = getTimestampInputValues(sRangeInput, pPanelRange);

    useEffect(() => {
        const sNextInputValues = getTimestampInputValues(sRangeInput, pPanelRange);
        setStartTime(sNextInputValues.startTime);
        setEndTime(sNextInputValues.endTime);
        pOnInvalidTimeInputChange(
            hasInvalidTimestampInputPair(
                sNextInputValues.startTime,
                sNextInputValues.endTime,
                pPanelRange,
            ),
        );
    }, [sRangeInput, pPanelRange, pOnInvalidTimeInputChange]);

    function updateTimeInput(field: TimeInputField, value: string): void {
        const sNextStartTime = field === 'start' ? value : sStartTime;
        const sNextEndTime = field === 'end' ? value : sEndTime;

        applyTimestampInputPair(sNextStartTime, sNextEndTime);
    }

    function applyTimeInput(field: TimeInputField, value: string): void {
        updateTimeInput(field, value);
    }

    function applyQuickTime(option: QuickTimeRangeOption): void {
        const [sStartValue = '', sEndValue = ''] = option.value;
        applyTimestampInputPair(sStartValue, sEndValue);
    }

    function applyTimestampInputPair(
        startTime: string,
        endTime: string,
    ): void {
        const sCurrentTime = Date.now();
        const sResolvedRange = resolveEditableTimeRangeInput({
            startValue: startTime,
            endValue: endTime,
            previousConcreteRange: getTimestampConcreteRange(
                pPanelRange,
                sCurrentTime,
            ),
            currentTime: sCurrentTime,
            lastDataTime: getTimestampLastDataTime(pPanelRange, sCurrentTime),
        });

        pOnInvalidTimeInputChange(sResolvedRange.status === 'invalid');

        if (sResolvedRange.status !== 'invalid') {
            pOnChangeTimeConfig(
                createTimeConfig(pTimeConfig, sResolvedRange.rangeInput),
            );
        }

        setStartTime(startTime);
        setEndTime(endTime);
    }

    function clearTimeRange(): void {
        pOnInvalidTimeInputChange(false);
        pOnChangeTimeConfig(
            createTimeConfig(pTimeConfig, { start: '', end: '' }),
        );
        setStartTime('');
        setEndTime('');
    }

    return (
        <div className={styles.timeLayout}>
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTitle}>
                        Panel configured time range
                    </span>
                </div>
                <div className={styles.controlStack}>
                    <div className={styles.controlRow}>
                        <TagAnalyzerDatePicker
                            label="From"
                            placement="top"
                            value={sStartTime}
                            placeholder={sInputValues.startPlaceholder}
                            onChange={(value) => updateTimeInput('start', value)}
                            onApply={(value) => applyTimeInput('start', value)}
                        />
                    </div>
                    <div className={styles.controlRow}>
                        <TagAnalyzerDatePicker
                            label="To"
                            placement="top"
                            value={sEndTime}
                            placeholder={sInputValues.endPlaceholder}
                            onChange={(value) => updateTimeInput('end', value)}
                            onApply={(value) => applyTimeInput('end', value)}
                        />
                    </div>
                    <div className={styles.controlRow}>
                        <Button variant="ghost" onClick={clearTimeRange}>
                            <VscTrash size={16} />
                            <span>Clear</span>
                        </Button>
                    </div>
                </div>
            </section>
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTitle}>
                        Quick panel configured range
                    </span>
                </div>
                <QuickTimeRange
                    options={TIME_RANGE}
                    onSelect={applyQuickTime}
                    title=""
                />
            </section>
        </div>
    );
}

function NumericRangeInputEditor({
    pTimeConfig,
    pOnChangeTimeConfig,
    pOnInvalidTimeInputChange,
}: {
    pTimeConfig: PanelInfo['time'];
    pOnChangeTimeConfig: (config: PanelInfo['time']) => void;
    pOnInvalidTimeInputChange: (hasInvalidTimeInput: boolean) => void;
}) {
    const sRangeInput = useMemo(
        () => getNumericRangeInput(pTimeConfig.rangeInput),
        [pTimeConfig],
    );
    const [sInputValues, setInputValues] = useState(
        () => getNumericInputValues(sRangeInput),
    );

    useEffect(() => {
        setInputValues(getNumericInputValues(sRangeInput));
        pOnInvalidTimeInputChange(false);
    }, [sRangeInput, pOnInvalidTimeInputChange]);

    function updateNumericRangeInput(
        field: 'startValue' | 'endValue',
        value: string,
    ): void {
        const nextInputValues = {
            ...sInputValues,
            [field]: value,
        };

        setInputValues(nextInputValues);
        const sRangeInput = createNumericRangeInputFromValues(
            nextInputValues.startValue,
            nextInputValues.endValue,
        );

        if (!sRangeInput) {
            pOnInvalidTimeInputChange(true);
            return;
        }

        pOnInvalidTimeInputChange(false);
        pOnChangeTimeConfig(createTimeConfig(pTimeConfig, sRangeInput));
    }

    function applyQuickNumericRange(option: QuickTimeRangeOption): void {
        const [sStartValue = '', sEndValue = ''] = option.value;
        const sRangeInput = createNumericRangeInputFromValues(
            sStartValue,
            sEndValue,
        );

        if (!sRangeInput) {
            pOnInvalidTimeInputChange(true);
            return;
        }

        pOnInvalidTimeInputChange(false);
        setInputValues({
            startValue: sStartValue,
            endValue: sEndValue,
        });
        pOnChangeTimeConfig(createTimeConfig(pTimeConfig, sRangeInput));
    }

    function clearNumericRange(): void {
        setInputValues(DEFAULT_NUMERIC_INPUT_VALUES);
        pOnInvalidTimeInputChange(false);
        pOnChangeTimeConfig(
            createTimeConfig(pTimeConfig, { start: '', end: '' }),
        );
    }

    return (
        <div className={styles.timeLayout}>
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTitle}>
                        Panel configured value range
                    </span>
                </div>
                <div className={styles.controlStack}>
                    <div className={styles.controlRow}>
                        <Input
                            label="From"
                            labelPosition="left"
                            value={sInputValues.startValue}
                            placeholder={NUMERIC_BOUNDARY_INPUT_PLACEHOLDER}
                            onChange={(event) =>
                                updateNumericRangeInput(
                                    'startValue',
                                    event.target.value,
                                )
                            }
                        />
                    </div>
                    <div className={styles.controlRow}>
                        <Input
                            label="To"
                            labelPosition="left"
                            value={sInputValues.endValue}
                            placeholder={NUMERIC_BOUNDARY_INPUT_PLACEHOLDER}
                            onChange={(event) =>
                                updateNumericRangeInput(
                                    'endValue',
                                    event.target.value,
                                )
                            }
                        />
                    </div>
                    <div className={styles.controlRow}>
                        <Button variant="ghost" onClick={clearNumericRange}>
                            <VscTrash size={16} />
                            <span>Clear</span>
                        </Button>
                    </div>
                </div>
            </section>
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTitle}>
                        Quick panel configured range
                    </span>
                </div>
                <QuickTimeRange
                    options={NUMERIC_QUICK_RANGE}
                    onSelect={applyQuickNumericRange}
                    title=""
                />
            </section>
        </div>
    );
}

function createTimeConfig(
    currentTimeConfig: PanelInfo['time'],
    rangeInput: PanelRangeInput,
): PanelInfo['time'] {
    return {
        ...currentTimeConfig,
        rangeInput,
    };
}

// The datetime panel config is itself a board-style TimeRangeInput; expressions
// that aren't valid for the datetime axis (e.g. leftover numeric input) reset to
// empty so the editor never shows an uninterpretable value.
function getTimestampRangeInput(
    rangeInput: PanelRangeInput,
): TimeRangeInput {
    return {
        start: sanitizeExpressionForAxis(rangeInput.start, false),
        end: sanitizeExpressionForAxis(rangeInput.end, false),
    };
}

function getNumericRangeInput(
    rangeInput: PanelRangeInput,
): PanelRangeInput {
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
): TimestampInputValues {
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

function hasInvalidTimestampInputPair(
    startTime: string,
    endTime: string,
    panelRange: TimeRangeMs,
): boolean {
    const sCurrentTime = Date.now();
    const sResolvedRange = resolveEditableTimeRangeInput({
        startValue: startTime,
        endValue: endTime,
        previousConcreteRange: getTimestampConcreteRange(panelRange, sCurrentTime),
        currentTime: sCurrentTime,
        lastDataTime: getTimestampLastDataTime(panelRange, sCurrentTime),
    });

    return sResolvedRange.status === 'invalid';
}

function getTimestampConcreteRange(
    panelRange: TimeRangeMs,
    currentTime: number,
): TimeRangeMs {
    return isValidTimeRange(panelRange)
        ? panelRange
        : createTimeRangeMs(currentTime - 1, currentTime);
}

function getTimestampLastDataTime(
    panelRange: TimeRangeMs,
    currentTime: number,
): number {
    return isValidTimeRange(panelRange) ? panelRange.endTime : currentTime;
}

function getNumericInputValues(
    rangeInput: PanelRangeInput,
): NumericInputValues {
    return {
        startValue: rangeInput.start,
        endValue: rangeInput.end,
    };
}

function createNumericRangeInputFromValues(
    startValue: string,
    endValue: string,
): PanelRangeInput | undefined {
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

export default EditorTimeTab;
