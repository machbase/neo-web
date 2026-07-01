import { TimeUnit, type PanelRangeInput } from '../../domain/time/TimeTypes';
import {
    formatNumericRangeExpression,
    formatNumericValue,
    isValidTimestampRangeExpression,
    parseNumericRangeExpression,
} from '../../domain/panelRange/PanelRangeInput';
import {
    formatAbsoluteTimeExpression,
    formatRelativeTimeExpression,
    parseAbsoluteTimeExpression,
} from '../../domain/time/TimeRangeInputResolver';
import { normalizePersistedTimeExpression } from './normalizePersistedTimeRangeInput';
import { asRecord } from '../../domain/ObjectGuards';

// Panel ranges persist as raw expression strings ({ start, end }) interpreted by
// the panel's x-axis kind. Older files stored each side as a structured range value
// object (timestamp_*/numeric_* kinds) or a raw number; those are converted to the
// equivalent expression string here so they still load.
export function normalizePersistedPanelRangeInput(
    rangeConfig: unknown,
    isNumericAxis: boolean,
): PanelRangeInput | undefined {
    const sRangeConfig = asRecord(rangeConfig);
    if (!sRangeConfig) {
        return undefined;
    }

    const sStart = normalizePersistedPanelRangeValue(sRangeConfig.start, isNumericAxis);
    const sEnd = normalizePersistedPanelRangeValue(sRangeConfig.end, isNumericAxis);

    if (sStart === undefined || sEnd === undefined) {
        return undefined;
    }

    return { start: sStart, end: sEnd };
}

function normalizePersistedPanelRangeValue(
    value: unknown,
    isNumericAxis: boolean,
): string | undefined {
    if (typeof value === 'number') {
        return isNumericAxis
            ? formatNumericValue(value)
            : formatAbsoluteTimeExpression(value);
    }

    if (typeof value === 'string') {
        return normalizePanelExpressionString(value, isNumericAxis);
    }

    const sRangeValue = asRecord(value);
    if (!sRangeValue) {
        return undefined;
    }

    return normalizeLegacyStructuredRangeValue(sRangeValue, isNumericAxis);
}

function normalizePanelExpressionString(
    value: string,
    isNumericAxis: boolean,
): string {
    const sValue = value.trim();
    if (sValue === '') {
        return '';
    }

    if (isNumericAxis) {
        const sParsed = parseNumericRangeExpression(sValue);
        if (sParsed) {
            return formatNumericRangeExpression(sParsed);
        }

        // A numeric panel could legacy-store an absolute datetime string.
        const sAbsolute = parseAbsoluteTimeExpression(sValue);
        return sAbsolute === undefined ? '' : formatNumericValue(sAbsolute);
    }

    return isValidTimestampRangeExpression(sValue) ? sValue : '';
}

function normalizeLegacyStructuredRangeValue(
    rangeValue: Record<string, unknown>,
    isNumericAxis: boolean,
): string {
    const sKind = rangeValue.kind;
    const sValue = typeof rangeValue.value === 'number' ? rangeValue.value : 0;

    switch (sKind) {
        case 'timestamp_empty':
        case 'numeric_empty':
            return '';
        case 'timestamp_absolute':
            return isNumericAxis
                ? formatNumericValue(sValue)
                : formatAbsoluteTimeExpression(sValue);
        case 'numeric_value':
            return isNumericAxis
                ? formatNumericValue(sValue)
                : formatAbsoluteTimeExpression(sValue);
        case 'timestamp_now':
            return formatLegacyMillisecondOffset('now', sValue);
        case 'timestamp_data_end':
            return formatLegacyMillisecondOffset('last', sValue);
        case 'numeric_data_start':
            return formatNumericRangeExpression({
                anchor: 'data_start',
                offset: Math.abs(sValue),
            });
        case 'numeric_data_end':
            return formatNumericRangeExpression({
                anchor: 'data_end',
                offset: Math.abs(sValue),
            });
        default:
            return normalizeLegacyBoardStyleRangeValue(rangeValue, isNumericAxis);
    }
}

// Older panels could also carry a board-style range value (empty/absolute/now/last/
// relative). Reuse the board normalizer for datetime panels; map an absolute one
// to a number for numeric panels.
function normalizeLegacyBoardStyleRangeValue(
    rangeValue: Record<string, unknown>,
    isNumericAxis: boolean,
): string {
    const sExpression = normalizePersistedTimeExpression(rangeValue);
    if (sExpression === undefined) {
        return '';
    }

    if (!isNumericAxis) {
        return sExpression;
    }

    const sAbsolute = parseAbsoluteTimeExpression(sExpression);
    return sAbsolute === undefined ? '' : formatNumericValue(sAbsolute);
}

function formatLegacyMillisecondOffset(
    anchor: 'now' | 'last',
    offsetMilliseconds: number,
): string {
    return formatRelativeTimeExpression(
        anchor,
        Math.abs(offsetMilliseconds),
        TimeUnit.Millisecond,
    );
}
