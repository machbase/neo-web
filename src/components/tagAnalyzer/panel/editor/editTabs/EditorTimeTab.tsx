import { useEffect, useState } from 'react';
import { Button, QuickTimeRange } from '@/design-system/components';
import type { QuickTimeRangeOption } from '@/design-system/components/QuickTimeRange';
import { VscTrash } from '@/assets/icons/Icon';
import { TIME_RANGE } from '@/utils/constants';
import TagAnalyzerDatePicker from '../../../datePicker/TagAnalyzerDatePicker';
import type { PanelEditorConfig } from '../PanelEditor';
import styles from '../PanelEditor.module.scss';
import {
    formatTimeRangeInputValue,
    parseTimeRangeInputValue,
    createAbsoluteTimeBoundary,
} from '../../../domain/time/TimeBoundaryInput';
import type {
    TimeBoundary,
    TimeRangeConfig,
    TimeRangeMs,
} from '../../../domain/time/TimeTypes';
import {
    createEmptyTimeRangeConfig,
    createTimeRangeConfig,
    isConcreteTimeRange,
} from '../../../domain/time/TimeRangeUtils';

type TimeInputField = 'start' | 'end';
type TimeInputValues = {
    startTime: string;
    endTime: string;
    startPlaceholder: string;
    endPlaceholder: string;
};

const DEFAULT_TIME_INPUT_PLACEHOLDER = 'YYYY-MM-DD HH:mm:ss';

const EditorTimeTab = ({
    pTimeConfig,
    pPanelRange,
    pOnChangeTimeConfig,
}: {
    pTimeConfig: PanelEditorConfig['time'];
    pPanelRange: TimeRangeMs;
    pOnChangeTimeConfig: (config: PanelEditorConfig['time']) => void;
}) => {
    const sInitialInputValues = getTimeInputValues(
        pTimeConfig,
        pPanelRange,
    );
    const [sStartTime, setStartTime] = useState(sInitialInputValues.startTime);
    const [sEndTime, setEndTime] = useState(sInitialInputValues.endTime);
    const sInputValues = getTimeInputValues(pTimeConfig, pPanelRange);

    useEffect(() => {
        const sNextInputValues = getTimeInputValues(pTimeConfig, pPanelRange);
        setStartTime(sNextInputValues.startTime);
        setEndTime(sNextInputValues.endTime);
    }, [pTimeConfig, pPanelRange]);

    function updateTimeInput(field: TimeInputField, value: string): void {
        const sBoundary = parseTimeRangeInputValue(value);
        if (sBoundary) {
            pOnChangeTimeConfig(
                getTimeConfigWithUpdatedBoundary(pTimeConfig, field, sBoundary),
            );
        }

        setTimeInputValue(field, value, setStartTime, setEndTime);
    }

    function applyTimeInput(field: TimeInputField, value: string): void {
        pOnChangeTimeConfig(
            getTimeConfigWithUpdatedBoundary(
                pTimeConfig,
                field,
                parseRequiredTimeBoundary(value),
            ),
        );
        setTimeInputValue(field, value, setStartTime, setEndTime);
    }

    function applyQuickTime(option: QuickTimeRangeOption): void {
        const [sStartValue = '', sEndValue = ''] = option.value;
        pOnChangeTimeConfig(
            createTimeConfig(
                parseRequiredTimeBoundary(sStartValue),
                parseRequiredTimeBoundary(sEndValue),
            ),
        );
        setStartTime(sStartValue);
        setEndTime(sEndValue);
    }

    function clearTimeRange(): void {
        const sRangeConfig = createEmptyTimeRangeConfig();
        pOnChangeTimeConfig(createTimeConfig(sRangeConfig.start, sRangeConfig.end));
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
};

function createTimeConfig(
    startBoundary: TimeBoundary,
    endBoundary: TimeBoundary,
): PanelEditorConfig['time'] {
    return { range_config: createTimeRangeConfig(startBoundary, endBoundary) };
}

function parseRequiredTimeBoundary(value: string): TimeBoundary {
    const sBoundary = parseTimeRangeInputValue(value);
    if (!sBoundary) {
        throw new Error(`Expected a valid time boundary: ${value}`);
    }

    return sBoundary;
}

function getTimeConfigWithUpdatedBoundary(
    timeConfig: PanelEditorConfig['time'],
    field: TimeInputField,
    boundary: TimeBoundary,
): PanelEditorConfig['time'] {
    const sStartBoundary =
        field === 'start' ? boundary : timeConfig.range_config.start;
    const sEndBoundary =
        field === 'end' ? boundary : timeConfig.range_config.end;

    return createTimeConfig(sStartBoundary, sEndBoundary);
}

function getTimeInputValues(
    timeConfig: PanelEditorConfig['time'],
    panelRange: TimeRangeMs,
): TimeInputValues {
    const sIsEmptyTimeRange = isEmptyTimeRangeConfig(timeConfig.range_config);

    return {
        startTime: formatTimeRangeInputValue(timeConfig.range_config.start),
        endTime: formatTimeRangeInputValue(timeConfig.range_config.end),
        startPlaceholder: sIsEmptyTimeRange && isConcreteTimeRange(panelRange)
            ? formatTimestampInputPlaceholder(panelRange.startTime)
            : DEFAULT_TIME_INPUT_PLACEHOLDER,
        endPlaceholder: sIsEmptyTimeRange && isConcreteTimeRange(panelRange)
            ? formatTimestampInputPlaceholder(panelRange.endTime)
            : DEFAULT_TIME_INPUT_PLACEHOLDER,
    };
}

function isEmptyTimeRangeConfig(timeRangeConfig: TimeRangeConfig): boolean {
    return (
        timeRangeConfig.start.kind === 'empty' &&
        timeRangeConfig.end.kind === 'empty'
    );
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

export default EditorTimeTab;
