import { useEffect, useMemo, useState } from 'react';
import { Button, Input, QuickTimeRange } from '@/design-system/components';
import type { QuickTimeRangeOption } from '@/design-system/components/QuickTimeRange';
import { VscTrash } from '@/assets/icons/Icon';
import { TIME_RANGE } from '@/utils/constants';
import TagAnalyzerDatePicker from '../../../datePicker/TagAnalyzerDatePicker';
import type { PanelEditorConfig } from '../PanelEditor';
import styles from '../PanelEditor.module.scss';
import {
    createAbsoluteTimeBoundary,
    createAnchoredTimeBoundary,
    formatTimeRangeInputValue,
    parseTimeRangeInputValue,
} from '../../../domain/time/boundary/TimeBoundaryInput';
import {
    formatAxisInputValue,
    parseAxisInputValue,
} from '../../../domain/time/formatting/TimeInputFormatters';
import {
    TimeUnit,
    type NumericRangeBoundary,
    type NumericRangeInput,
    type PanelRangeInput,
    type TimeBoundary,
    type TimeRangeMs,
    type TimestampRangeBoundary,
    type TimestampRangeInput,
} from '../../../domain/time/model/TimeTypes';
import {
    createNumericRangeBoundary,
    createNumericRangeInput,
    createTimestampRangeBoundary,
    createTimestampRangeBoundaryFromTimeBoundary,
    createTimestampRangeInput,
    isEmptyPanelRangeInput,
    isNumericRangeInput,
    isTimestampRangeInput,
} from '../../../domain/time/range/PanelRangeConfigUtils';
import { isValidTimeRange } from '../../../domain/time/range/TimeRangeUtils';

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
const NUMERIC_ANCHORED_BOUNDARY_PATTERN =
    /^(first|last)(?:-((?:\d+\.?\d*)|(?:\.\d+)))?$/i;
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
}: {
    pTimeConfig: PanelEditorConfig['timeRange'];
    pIsNumericXAxis: boolean;
    pPanelRange: TimeRangeMs;
    pOnChangeTimeConfig: (config: PanelEditorConfig['timeRange']) => void;
}) => {
    if (pIsNumericXAxis) {
        return (
            <NumericRangeInputEditor
                pTimeConfig={pTimeConfig}
                pOnChangeTimeConfig={pOnChangeTimeConfig}
            />
        );
    }

    return (
        <TimestampRangeInputEditor
            pTimeConfig={pTimeConfig}
            pPanelRange={pPanelRange}
            pOnChangeTimeConfig={pOnChangeTimeConfig}
        />
    );
};

function TimestampRangeInputEditor({
    pTimeConfig,
    pPanelRange,
    pOnChangeTimeConfig,
}: {
    pTimeConfig: PanelEditorConfig['timeRange'];
    pPanelRange: TimeRangeMs;
    pOnChangeTimeConfig: (config: PanelEditorConfig['timeRange']) => void;
}) {
    const sRangeConfig = useMemo(
        () => getTimestampRangeInput(pTimeConfig),
        [pTimeConfig],
    );
    const sInitialInputValues = getTimestampInputValues(
        sRangeConfig,
        pPanelRange,
    );
    const [sStartTime, setStartTime] = useState(sInitialInputValues.startTime);
    const [sEndTime, setEndTime] = useState(sInitialInputValues.endTime);
    const sInputValues = getTimestampInputValues(sRangeConfig, pPanelRange);

    useEffect(() => {
        const sNextInputValues = getTimestampInputValues(sRangeConfig, pPanelRange);
        setStartTime(sNextInputValues.startTime);
        setEndTime(sNextInputValues.endTime);
    }, [sRangeConfig, pPanelRange]);

    function updateTimeInput(field: TimeInputField, value: string): void {
        const sBoundary = parseTimeRangeInputValue(value);
        if (sBoundary) {
            pOnChangeTimeConfig(
                createTimeConfig(
                    pTimeConfig,
                    getTimestampConfigWithUpdatedBoundary(
                        sRangeConfig,
                        field,
                        createTimestampRangeBoundaryFromTimeBoundary(sBoundary),
                    ),
                ),
            );
        }

        setTimeInputValue(field, value, setStartTime, setEndTime);
    }

    function applyTimeInput(field: TimeInputField, value: string): void {
        pOnChangeTimeConfig(
            createTimeConfig(
                pTimeConfig,
                getTimestampConfigWithUpdatedBoundary(
                    sRangeConfig,
                    field,
                    createTimestampRangeBoundaryFromTimeBoundary(
                        parseRequiredTimeBoundary(value),
                    ),
                ),
            ),
        );
        setTimeInputValue(field, value, setStartTime, setEndTime);
    }

    function applyQuickTime(option: QuickTimeRangeOption): void {
        const [sStartValue = '', sEndValue = ''] = option.value;
        pOnChangeTimeConfig(
            createTimeConfig(
                pTimeConfig,
                createTimestampRangeInput(
                    createTimestampRangeBoundaryFromTimeBoundary(
                        parseRequiredTimeBoundary(sStartValue),
                    ),
                    createTimestampRangeBoundaryFromTimeBoundary(
                        parseRequiredTimeBoundary(sEndValue),
                    ),
                ),
            ),
        );
        setStartTime(sStartValue);
        setEndTime(sEndValue);
    }

    function clearTimeRange(): void {
        pOnChangeTimeConfig(
            createTimeConfig(
                pTimeConfig,
                createTimestampRangeInput(
                    createTimestampRangeBoundary('timestamp_empty'),
                    createTimestampRangeBoundary('timestamp_empty'),
                ),
            ),
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
                            topPixel={-370}
                            value={sStartTime}
                            placeholder={sInputValues.startPlaceholder}
                            onChange={(value) => updateTimeInput('start', value)}
                            onApply={(value) => applyTimeInput('start', value)}
                        />
                    </div>
                    <div className={styles.controlRow}>
                        <TagAnalyzerDatePicker
                            label="To"
                            topPixel={-370}
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
}: {
    pTimeConfig: PanelEditorConfig['timeRange'];
    pOnChangeTimeConfig: (config: PanelEditorConfig['timeRange']) => void;
}) {
    const sRangeConfig = useMemo(
        () => getNumericRangeInput(pTimeConfig),
        [pTimeConfig],
    );
    const [sInputValues, setInputValues] = useState(
        () => getNumericInputValues(sRangeConfig),
    );

    useEffect(() => {
        setInputValues(getNumericInputValues(sRangeConfig));
    }, [sRangeConfig]);

    function updateNumericBoundaryInput(
        field: 'startValue' | 'endValue',
        value: string,
    ): void {
        const nextInputValues = {
            ...sInputValues,
            [field]: value,
        };

        setInputValues(nextInputValues);
        const sRangeConfig = createNumericRangeInputFromBoundaryInput(
            nextInputValues.startValue,
            nextInputValues.endValue,
        );

        if (sRangeConfig) {
            pOnChangeTimeConfig(createTimeConfig(pTimeConfig, sRangeConfig));
        }
    }

    function applyQuickNumericRange(option: QuickTimeRangeOption): void {
        const [sStartValue = '', sEndValue = ''] = option.value;
        const sRangeConfig = createNumericRangeInputFromBoundaryInput(
            sStartValue,
            sEndValue,
        );

        if (!sRangeConfig) {
            return;
        }

        setInputValues({
            startValue: sStartValue,
            endValue: sEndValue,
        });
        pOnChangeTimeConfig(createTimeConfig(pTimeConfig, sRangeConfig));
    }

    function clearNumericRange(): void {
        setInputValues(DEFAULT_NUMERIC_INPUT_VALUES);
        pOnChangeTimeConfig(
            createTimeConfig(
                pTimeConfig,
                createNumericRangeInput(
                    createNumericRangeBoundary('numeric_empty'),
                    createNumericRangeBoundary('numeric_empty'),
                ),
            ),
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
                                updateNumericBoundaryInput(
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
                                updateNumericBoundaryInput(
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
    currentTimeConfig: PanelEditorConfig['timeRange'],
    rangeConfig: PanelRangeInput,
): PanelEditorConfig['timeRange'] {
    return {
        ...rangeConfig,
        useLastViewedRange: currentTimeConfig.useLastViewedRange,
        lastViewedRange: currentTimeConfig.lastViewedRange,
    };
}

function parseRequiredTimeBoundary(value: string): TimeBoundary {
    const sBoundary = parseTimeRangeInputValue(value);
    if (!sBoundary) {
        throw new Error(`Expected a valid time boundary: ${value}`);
    }

    return sBoundary;
}

function getTimestampConfigWithUpdatedBoundary(
    rangeConfig: TimestampRangeInput,
    field: TimeInputField,
    boundary: TimestampRangeBoundary,
): TimestampRangeInput {
    const sStartBoundary =
        field === 'start' ? boundary : rangeConfig.start;
    const sEndBoundary =
        field === 'end' ? boundary : rangeConfig.end;

    return createTimestampRangeInput(sStartBoundary, sEndBoundary);
}

function getTimestampRangeInput(
    rangeConfig: PanelRangeInput,
): TimestampRangeInput {
    return isTimestampRangeInput(rangeConfig)
        ? rangeConfig
        : createTimestampRangeInput(
              createTimestampRangeBoundary('timestamp_empty'),
              createTimestampRangeBoundary('timestamp_empty'),
          );
}

function getNumericRangeInput(
    rangeConfig: PanelRangeInput,
): NumericRangeInput {
    return isNumericRangeInput(rangeConfig)
        ? rangeConfig
        : createNumericRangeInput(
              createNumericRangeBoundary('numeric_empty'),
              createNumericRangeBoundary('numeric_empty'),
          );
}

function getTimestampInputValues(
    rangeConfig: TimestampRangeInput,
    panelRange: TimeRangeMs,
): TimestampInputValues {
    const sIsEmptyTimeRange = isEmptyPanelRangeInput(rangeConfig);

    return {
        startTime: formatTimestampRangeBoundaryInputValue(rangeConfig.start),
        endTime: formatTimestampRangeBoundaryInputValue(rangeConfig.end),
        startPlaceholder: sIsEmptyTimeRange && isValidTimeRange(panelRange)
            ? formatTimestampInputPlaceholder(panelRange.startTime)
            : DEFAULT_TIME_INPUT_PLACEHOLDER,
        endPlaceholder: sIsEmptyTimeRange && isValidTimeRange(panelRange)
            ? formatTimestampInputPlaceholder(panelRange.endTime)
            : DEFAULT_TIME_INPUT_PLACEHOLDER,
    };
}

function formatTimestampRangeBoundaryInputValue(
    boundary: TimestampRangeBoundary,
): string {
    switch (boundary.kind) {
        case 'timestamp_empty':
            return '';
        case 'timestamp_absolute':
            return formatTimestampInputPlaceholder(boundary.value);
        case 'timestamp_now':
            return formatTimeRangeInputValue(
                createAnchoredTimeBoundary(
                    'now',
                    Math.max(Math.abs(boundary.value), 0),
                    TimeUnit.Millisecond,
                ),
            );
        case 'timestamp_data_end':
            return formatTimeRangeInputValue(
                createAnchoredTimeBoundary(
                    'last',
                    Math.max(Math.abs(boundary.value), 0),
                    TimeUnit.Millisecond,
                ),
            );
    }
}

function formatTimestampInputPlaceholder(timestamp: number): string {
    return formatTimeRangeInputValue(createAbsoluteTimeBoundary(timestamp));
}

function setTimeInputValue(
    field: TimeInputField,
    value: string,
    setStartTime: (value: string) => void,
    setEndTime: (value: string) => void,
): void {
    if (field === 'start') {
        setStartTime(value);
        return;
    }

    setEndTime(value);
}

function getNumericInputValues(
    rangeConfig: NumericRangeInput,
): NumericInputValues {
    return {
        startValue: formatNumericBoundaryInputValue(rangeConfig.start),
        endValue: formatNumericBoundaryInputValue(rangeConfig.end),
    };
}

function createNumericRangeInputFromBoundaryInput(
    startValue: string,
    endValue: string,
): NumericRangeInput | undefined {
    const sStartBoundary = parseNumericBoundaryInputValue(startValue);
    const sEndBoundary = parseNumericBoundaryInputValue(endValue);

    if (!sStartBoundary || !sEndBoundary) {
        return undefined;
    }

    if (
        sStartBoundary.kind === 'numeric_empty' &&
        sEndBoundary.kind === 'numeric_empty'
    ) {
        return createNumericRangeInput(
            createNumericRangeBoundary('numeric_empty'),
            createNumericRangeBoundary('numeric_empty'),
        );
    }

    if (
        sStartBoundary.kind === 'numeric_empty' ||
        sEndBoundary.kind === 'numeric_empty' ||
        !isNumericBoundaryRangeValid(sStartBoundary, sEndBoundary)
    ) {
        return undefined;
    }

    return createNumericRangeInput(sStartBoundary, sEndBoundary);
}

function parseNumericBoundaryInputValue(
    value: string,
): NumericRangeBoundary | undefined {
    const sText = value.trim();
    if (sText === '') {
        return createNumericRangeBoundary('numeric_empty');
    }

    const sAnchoredBoundary = parseNumericAnchoredBoundaryInputValue(sText);
    if (sAnchoredBoundary) {
        return sAnchoredBoundary;
    }

    const sValue = parseAxisInputValue(sText, true);
    return sValue === undefined
        ? undefined
        : createNumericRangeBoundary('numeric_value', sValue);
}

function parseNumericAnchoredBoundaryInputValue(
    value: string,
): NumericRangeBoundary | undefined {
    const sMatch = value.match(NUMERIC_ANCHORED_BOUNDARY_PATTERN);
    if (!sMatch) {
        return undefined;
    }

    const sAnchor = sMatch[1].toLowerCase();
    const sAmount = sMatch[2] ? Number(sMatch[2]) : 0;
    if (!Number.isFinite(sAmount) || sAmount < 0) {
        return undefined;
    }

    return sAnchor === 'first'
        ? createNumericRangeBoundary('numeric_data_start', sAmount)
        : createNumericRangeBoundary(
              'numeric_data_end',
              sAmount === 0 ? 0 : -sAmount,
          );
}

function isNumericBoundaryRangeValid(
    startBoundary: NumericRangeBoundary,
    endBoundary: NumericRangeBoundary,
): boolean {
    if (
        startBoundary.kind === 'numeric_value' &&
        endBoundary.kind === 'numeric_value'
    ) {
        return startBoundary.value < endBoundary.value;
    }

    if (
        startBoundary.kind === 'numeric_data_start' &&
        endBoundary.kind === 'numeric_data_start'
    ) {
        return startBoundary.value < endBoundary.value;
    }

    if (
        startBoundary.kind === 'numeric_data_end' &&
        endBoundary.kind === 'numeric_data_end'
    ) {
        return startBoundary.value < endBoundary.value;
    }

    return true;
}

function formatNumericBoundaryInputValue(
    boundary: NumericRangeBoundary,
): string {
    switch (boundary.kind) {
        case 'numeric_empty':
            return '';
        case 'numeric_value':
            return formatAxisInputValue(boundary.value, true);
        case 'numeric_data_start':
            return boundary.value === 0
                ? 'first'
                : `first-${formatAxisInputValue(boundary.value, true)}`;
        case 'numeric_data_end':
            return boundary.value === 0
                ? 'last'
                : `last-${formatAxisInputValue(Math.abs(boundary.value), true)}`;
    }
}

export default EditorTimeTab;
