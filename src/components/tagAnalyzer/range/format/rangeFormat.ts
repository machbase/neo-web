import { isRangeExpressionEmpty, type AxisRange, type RangeExpressionInput } from '../rangeModel';
import {
    formatNumericAxisLabel,
    formatNumericRange,
    formatNumericValue,
    normalizeNumericRangeInput,
    resolveNumericRangeInput,
} from './numericRangeFormat';
import {
    formatTimeAxisInputValue,
    formatTimeRange,
    formatTimeAxisPointerLabel,
    formatTimeAxisValue,
    formatTimeRangeSpanLabel,
    LOCAL_DATE_TIME_INPUT_FORMAT,
    parseTimeAxisInputValue,
    resolveEditableTimeRangeInput,
    resolveTimestampRangeInput,
} from './timeRangeFormat';

export function formatAxisRange(
    range: AxisRange,
    isNumericAxis: boolean,
): { start: string; end: string } {
    return isNumericAxis ? formatNumericRange(range) : formatTimeRange(range);
}

export function normalizePanelRangeInputForAxis(
    rangeInput: RangeExpressionInput,
    isNumericAxis: boolean,
    dataRange: AxisRange,
): RangeExpressionInput | undefined {
    if (isNumericAxis) {
        const sNormalizedRangeInput = normalizeNumericRangeInput(
            rangeInput,
            true,
        );
        return sNormalizedRangeInput &&
            resolveNumericRangeInput(sNormalizedRangeInput, dataRange)
            ? sNormalizedRangeInput
            : undefined;
    }

    const sCurrentTime = Date.now();
    const sResolution = resolveEditableTimeRangeInput({
        startValue: rangeInput.start,
        endValue: rangeInput.end,
        previousConcreteRange: dataRange,
        currentTime: sCurrentTime,
        firstDataTime: dataRange.startTime,
        lastDataTime: dataRange.endTime,
    });

    return sResolution.status === 'invalid'
        ? undefined
        : sResolution.rangeInput;
}

export function resolvePanelRangeInput(
    rangeInput: RangeExpressionInput,
    fullRange: AxisRange,
    isNumericAxis: boolean,
): AxisRange | undefined {
    if (isRangeExpressionEmpty(rangeInput)) {
        return undefined;
    }

    return isNumericAxis
        ? resolveNumericRangeInput(rangeInput, fullRange)
        : resolveTimestampRangeInput(
              rangeInput,
              {
                  currentTime: Date.now(),
                  firstDataTime: fullRange.startTime,
                  lastDataTime: fullRange.endTime,
              },
              fullRange,
          );
}

export function getAxisInputPlaceholder(isNumericAxis: boolean): string {
    return isNumericAxis ? 'Numeric value' : LOCAL_DATE_TIME_INPUT_FORMAT;
}

export function formatAxisInputValue(
    value: number,
    isNumericAxis: boolean,
): string {
    return isNumericAxis
        ? formatNumericValue(value)
        : formatTimeAxisInputValue(value);
}

export function parseAxisInputValue(
    value: string,
    isNumericAxis: boolean,
): number | undefined {
    const text: string = value.trim();
    if (text === '') {
        return undefined;
    }

    if (!isNumericAxis) {
        return parseTimeAxisInputValue(text);
    }

    const numericValue: number = Number(text);
    return Number.isFinite(numericValue) ? numericValue : undefined;
}

export function formatAxisPointerLabel(
    value: number,
    isNumericAxis: boolean,
    visibleRange?: AxisRange,
): string {
    return isNumericAxis
        ? formatNumericAxisLabel(value, visibleRange)
        : formatTimeAxisPointerLabel(value);
}

export function formatAxisValue(
    value: number,
    range: AxisRange,
    isNumericAxis: boolean,
): string {
    return isNumericAxis
        ? formatNumericAxisLabel(value, range)
        : formatTimeAxisValue(value, range);
}

export function formatRangeSpanLabel(
    startTime: number,
    endTime: number,
    isNumericAxis: boolean,
): string {
    return isNumericAxis
        ? formatNumericAxisLabel(endTime - startTime)
        : formatTimeRangeSpanLabel(startTime, endTime);
}
