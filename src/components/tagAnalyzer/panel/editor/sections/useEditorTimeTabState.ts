import { useEffect, useState } from 'react';
import type { QuickTimeRangeOption } from '@/design-system/components/QuickTimeRange';
import type { TimeBoundary } from '../../../domain/time/TimeTypes';
import type {
    PanelTimeConfig,
    TimeInputEvent,
    TimeInputField,
    TimeInputValues,
    UseEditorTimeTabStateArgs,
} from '../EditorTypes';
import { formatTimeRangeInputValue } from '../../../domain/time/TimeBoundaryFormatter';
import { parseTimeRangeInputValue } from '../../../domain/time/TimeBoundaryParser';
import {
    createEmptyTimeRangeConfig,
    createTimeRangeConfig,
} from '../../../domain/time/TimeRangeUtils';

export function buildTimeConfigFromBoundaries(
    startBoundary: TimeBoundary,
    endBoundary: TimeBoundary,
): PanelTimeConfig {
    const sRangeConfig = createTimeRangeConfig(startBoundary, endBoundary);

    return {
        range_config: sRangeConfig,
    };
}

export function parseRequiredTimeBoundary(value: string): TimeBoundary {
    const sBoundary = parseTimeRangeInputValue(value);
    if (!sBoundary) {
        throw new Error(`Expected a valid time boundary: ${value}`);
    }

    return sBoundary;
}

export function getTimeConfigWithUpdatedBoundary(
    timeConfig: PanelTimeConfig,
    field: TimeInputField,
    boundary: TimeBoundary | undefined,
): PanelTimeConfig | undefined {
    if (boundary === undefined) {
        return undefined;
    }

    const sStartBoundary =
        field === 'start' ? boundary : timeConfig.range_config.start;
    const sEndBoundary =
        field === 'end' ? boundary : timeConfig.range_config.end;

    return buildTimeConfigFromBoundaries(sStartBoundary, sEndBoundary);
}

export function useEditorTimeTabState({
    timeConfig,
    onChangeTimeConfig,
}: UseEditorTimeTabStateArgs) {
    const sInitialInputValues = getTimeInputValues(timeConfig);
    const [startTime, setStartTime] = useState<string>(sInitialInputValues.startTime);
    const [endTime, setEndTime] = useState<string>(sInitialInputValues.endTime);

    useEffect(() => {
        const sInputValues = getTimeInputValues(timeConfig);
        setStartTime(sInputValues.startTime);
        setEndTime(sInputValues.endTime);
    }, [timeConfig]);

    const handleTimeChange = (field: TimeInputField, event: TimeInputEvent) => {
        const sNextValue = event.target.value;
        const sNextTimeConfig = getTimeConfigWithUpdatedBoundary(
            timeConfig,
            field,
            parseTimeRangeInputValue(sNextValue),
        );
        if (sNextTimeConfig) {
            onChangeTimeConfig(sNextTimeConfig);
        }

        setTimeInputValue(field, sNextValue, setStartTime, setEndTime);
    };

    const handleTimeApply = (field: TimeInputField, value: string) => {
        const sNextTimeConfig = getTimeConfigWithUpdatedBoundary(
            timeConfig,
            field,
            parseRequiredTimeBoundary(value),
        );
        if (!sNextTimeConfig) {
            return;
        }

        onChangeTimeConfig(sNextTimeConfig);
        setTimeInputValue(field, value, setStartTime, setEndTime);
    };

    const handleQuickTime = (option: QuickTimeRangeOption) => {
        const [sStartValue = '', sEndValue = ''] = option.value;
        onChangeTimeConfig(
            buildTimeConfigFromBoundaries(
                parseRequiredTimeBoundary(sStartValue),
                parseRequiredTimeBoundary(sEndValue),
            ),
        );
        setStartTime(sStartValue);
        setEndTime(sEndValue);
    };

    const handleClear = () => {
        const sRangeConfig = createEmptyTimeRangeConfig();
        onChangeTimeConfig(
            buildTimeConfigFromBoundaries(sRangeConfig.start, sRangeConfig.end),
        );
        setStartTime('');
        setEndTime('');
    };

    return {
        startTime,
        endTime,
        handleTimeChange,
        handleTimeApply,
        handleQuickTime,
        handleClear,
    };
}

function getTimeInputValues(timeConfig: PanelTimeConfig): TimeInputValues {
    return {
        startTime: formatTimeRangeInputValue(timeConfig.range_config.start),
        endTime: formatTimeRangeInputValue(timeConfig.range_config.end),
    };
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




