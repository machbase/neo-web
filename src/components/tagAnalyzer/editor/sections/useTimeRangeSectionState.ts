import { useEffect, useState } from 'react';
import type { QuickTimeRangeOption } from '@/design-system/components/QuickTimeRange';
import type { TagAnalyzerPanelTimeConfig } from '../PanelEditorTypes';
import type { TimeBoundary } from '../../utils/time/timeTypes';
import {
    formatTimeRangeInputValue,
    normalizeTimeRangeConfig,
    parseTimeRangeInputValue,
} from '../../utils/time/TimeBoundaryParsing';

export type TimeInputField = 'range_bgn' | 'range_end';

export type TimeInputEvent = {
    target: {
        value: string;
    };
};

type UseTimeRangeSectionStateArgs = {
    timeConfig: TagAnalyzerPanelTimeConfig;
    onChangeTimeConfig: (aConfig: TagAnalyzerPanelTimeConfig) => void;
};

type TimeInputValues = {
    startTime: string;
    endTime: string;
};

/**
 * Builds editor time config from structured start and end boundaries.
 * Intent: Keep time-range normalization in one explicit conversion path.
 * @param {TimeBoundary} aStartBoundary The next start boundary.
 * @param {TimeBoundary} aEndBoundary The next end boundary.
 * @returns {TagAnalyzerPanelTimeConfig} The normalized editor time config.
 */
export function buildTimeConfigFromBoundaries(
    aStartBoundary: TimeBoundary,
    aEndBoundary: TimeBoundary,
): TagAnalyzerPanelTimeConfig {
    const sNormalizedTimeRange = normalizeTimeRangeConfig({
        start: aStartBoundary,
        end: aEndBoundary,
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
 * @param {string} aValue The time input value to parse.
 * @returns {TimeBoundary} The parsed time boundary.
 */
export function parseRequiredTimeBoundary(aValue: string): TimeBoundary {
    const sBoundary = parseTimeRangeInputValue(aValue);
    if (!sBoundary) {
        throw new Error(`Expected a valid time boundary: ${aValue}`);
    }

    return sBoundary;
}

/**
 * Builds the next time config after updating one side of the range.
 * Intent: Preserve the untouched boundary when only one input changes.
 * @param {TagAnalyzerPanelTimeConfig} aTimeConfig The current editor time config.
 * @param {TimeInputField} aField The boundary field being updated.
 * @param {TimeBoundary | undefined} aBoundary The new parsed boundary.
 * @returns {TagAnalyzerPanelTimeConfig | undefined} The next time config, or undefined when the new boundary is invalid.
 */
export function getTimeConfigWithUpdatedBoundary(
    aTimeConfig: TagAnalyzerPanelTimeConfig,
    aField: TimeInputField,
    aBoundary: TimeBoundary | undefined,
): TagAnalyzerPanelTimeConfig | undefined {
    if (aBoundary === undefined) {
        return undefined;
    }

    const sStartBoundary =
        aField === 'range_bgn' ? aBoundary : aTimeConfig.range_config.start;
    const sEndBoundary =
        aField === 'range_end' ? aBoundary : aTimeConfig.range_config.end;

    return buildTimeConfigFromBoundaries(sStartBoundary, sEndBoundary);
}

/**
 * Owns the local input buffers and update handlers for the time-range editor section.
 * Intent: Keep buffer synchronization and parsed-config updates outside the JSX-heavy section component.
 * @param {UseTimeRangeSectionStateArgs} aArgs The current editor time config and its update callback.
 * @returns The local input values plus the handlers used by the time-range section UI.
 */
export function useTimeRangeSectionState({
    timeConfig,
    onChangeTimeConfig,
}: UseTimeRangeSectionStateArgs) {
    const sInitialInputValues = getTimeInputValues(timeConfig);
    const [startTime, setStartTime] = useState<string>(sInitialInputValues.startTime);
    const [endTime, setEndTime] = useState<string>(sInitialInputValues.endTime);

    useEffect(() => {
        const sInputValues = getTimeInputValues(timeConfig);
        setStartTime(sInputValues.startTime);
        setEndTime(sInputValues.endTime);
    }, [timeConfig]);

    const handleTimeChange = (aField: TimeInputField, aEvent: TimeInputEvent) => {
        const sNextValue = aEvent.target.value;
        const sNextTimeConfig = getTimeConfigWithUpdatedBoundary(
            timeConfig,
            aField,
            parseTimeRangeInputValue(sNextValue),
        );
        if (sNextTimeConfig) {
            onChangeTimeConfig(sNextTimeConfig);
        }

        setTimeInputValue(aField, sNextValue, setStartTime, setEndTime);
    };

    const handleTimeApply = (aField: TimeInputField, aValue: string) => {
        const sNextTimeConfig = getTimeConfigWithUpdatedBoundary(
            timeConfig,
            aField,
            parseRequiredTimeBoundary(aValue),
        );
        if (!sNextTimeConfig) {
            return;
        }

        onChangeTimeConfig(sNextTimeConfig);
        setTimeInputValue(aField, aValue, setStartTime, setEndTime);
    };

    const handleQuickTime = (aOption: QuickTimeRangeOption) => {
        const [sStartValue = '', sEndValue = ''] = aOption.value;
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
 * @param {TagAnalyzerPanelTimeConfig} aTimeConfig The current editor time config.
 * @returns {TimeInputValues} The formatted start and end input strings.
 */
function getTimeInputValues(aTimeConfig: TagAnalyzerPanelTimeConfig): TimeInputValues {
    return {
        startTime: formatTimeRangeInputValue(aTimeConfig.range_config.start),
        endTime: formatTimeRangeInputValue(aTimeConfig.range_config.end),
    };
}

/**
 * Writes one input buffer value into the matching local state setter.
 * Intent: Keep the start and end text buffers updated through one explicit branch.
 * @param {TimeInputField} aField The input field being updated.
 * @param {string} aValue The next input value.
 * @param {(aValue: string) => void} aSetStartTime Updates the start input buffer.
 * @param {(aValue: string) => void} aSetEndTime Updates the end input buffer.
 * @returns {void}
 */
function setTimeInputValue(
    aField: TimeInputField,
    aValue: string,
    aSetStartTime: (aValue: string) => void,
    aSetEndTime: (aValue: string) => void,
): void {
    if (aField === 'range_bgn') {
        aSetStartTime(aValue);
        return;
    }

    aSetEndTime(aValue);
}
