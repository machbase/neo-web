import { useEffect, useState } from 'react';
import type { QuickTimeRangeOption } from '@/design-system/components/QuickTimeRange';
import type { TimeBoundary } from '../../../utils/time/types/TimeTypes';
import type {
    PanelTimeConfig,
    TimeInputEvent,
    TimeInputField,
    TimeInputValues,
    UseEditorTimeTabStateArgs,
} from '../EditorTypes';
import {
    formatTimeRangeInputValue,
    normalizeTimeRangeConfig,
    parseTimeRangeInputValue,
} from '../../../utils/time/TimeBoundaryParsing';

/**
 * Builds editor time config from structured start and end boundaries.
 * Intent: Keep time-range normalization in one explicit conversion path.
 * @param {TimeBoundary} startBoundary The next start boundary.
 * @param {TimeBoundary} endBoundary The next end boundary.
 * @returns {PanelTimeConfig} The normalized editor time config.
 */
export function buildTimeConfigFromBoundaries(
    startBoundary: TimeBoundary,
    endBoundary: TimeBoundary,
): PanelTimeConfig {
    const sNormalizedTimeRange = normalizeTimeRangeConfig({
        start: startBoundary,
        end: endBoundary,
    });

    return {
        range_bgn: sNormalizedTimeRange.range.min,
        range_end: sNormalizedTimeRange.range.max,
        range_config: sNormalizedTimeRange.rangeConfig,
    };
}

/**
 * Parses one time input value and throws when the value is invalid.
 * Intent: Keep quick-range presets and committed inputs on the same supported parser rules.
 * @param {string} value The time input value to parse.
 * @returns {TimeBoundary} The parsed time boundary.
 */
export function parseRequiredTimeBoundary(value: string): TimeBoundary {
    const sBoundary = parseTimeRangeInputValue(value);
    if (!sBoundary) {
        throw new Error(`Expected a valid time boundary: ${value}`);
    }

    return sBoundary;
}

/**
 * Builds the next time config after updating one side of the range.
 * Intent: Preserve the untouched boundary when only one input changes.
 * @param {PanelTimeConfig} timeConfig The current editor time config.
 * @param {TimeInputField} field The boundary field being updated.
 * @param {TimeBoundary | undefined} boundary The new parsed boundary.
 * @returns {PanelTimeConfig | undefined} The next time config, or undefined when the new boundary is invalid.
 */
export function getTimeConfigWithUpdatedBoundary(
    timeConfig: PanelTimeConfig,
    field: TimeInputField,
    boundary: TimeBoundary | undefined,
): PanelTimeConfig | undefined {
    if (boundary === undefined) {
        return undefined;
    }

    const sStartBoundary =
        field === 'range_bgn' ? boundary : timeConfig.range_config.start;
    const sEndBoundary =
        field === 'range_end' ? boundary : timeConfig.range_config.end;

    return buildTimeConfigFromBoundaries(sStartBoundary, sEndBoundary);
}

/**
 * Owns the local input buffers and update handlers for the time-range editor section.
 * Intent: Keep buffer synchronization and parsed-config updates outside the JSX-heavy section component.
 * @param {UseEditorTimeTabStateArgs} aArgs The current editor time config and its update callback.
 * @returns The local input values plus the handlers used by the time-range section UI.
 */
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
        onChangeTimeConfig(
            buildTimeConfigFromBoundaries({ kind: 'empty' }, { kind: 'empty' }),
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

/**
 * Formats the current time config into the two text inputs used by the editor.
 * Intent: Keep buffer synchronization consistent between initial render and config updates.
 * @param {PanelTimeConfig} timeConfig The current editor time config.
 * @returns {TimeInputValues} The formatted start and end input strings.
 */
function getTimeInputValues(timeConfig: PanelTimeConfig): TimeInputValues {
    return {
        startTime: formatTimeRangeInputValue(timeConfig.range_config.start),
        endTime: formatTimeRangeInputValue(timeConfig.range_config.end),
    };
}

/**
 * Writes one input buffer value into the matching local state setter.
 * Intent: Keep the start and end text buffers updated through one explicit branch.
 * @param {TimeInputField} field The input field being updated.
 * @param {string} value The next input value.
 * @param {(aValue: string) => void} setStartTime Updates the start input buffer.
 * @param {(aValue: string) => void} setEndTime Updates the end input buffer.
 * @returns {void}
 */
function setTimeInputValue(
    field: TimeInputField,
    value: string,
    setStartTime: (value: string) => void,
    setEndTime: (value: string) => void,
): void {
    if (field === 'range_bgn') {
        setStartTime(value);
        return;
    }

    setEndTime(value);
}
