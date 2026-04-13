import type { TagAnalyzerInputRangeValue } from '../panel/PanelModel';

/**
 * Detects whether a range value uses the "last ..." relative-time format.
 * @param aValue The range value to inspect.
 * @returns Whether the value is a last-relative time string.
 */
export function isRelativeTimeValue(aValue: TagAnalyzerInputRangeValue): aValue is string {
    return isLastRelativeTimeValue(aValue) || isNowRelativeTimeValue(aValue);
}

/**
 * Detects whether a range value uses the "last ..." relative-time format.
 * @param aValue The range value to inspect.
 * @returns Whether the value is a last-relative time string.
 */
export function isLastRelativeTimeValue(aValue: TagAnalyzerInputRangeValue): aValue is string {
    return typeof aValue === 'string' && normalizeRelativeTimeValue(aValue).includes('last');
}

/**
 * Detects whether a range value uses the "now ..." relative-time format.
 * @param aValue The range value to inspect.
 * @returns Whether the value is a now-relative time string.
 */
export function isNowRelativeTimeValue(aValue: TagAnalyzerInputRangeValue): aValue is string {
    return typeof aValue === 'string' && normalizeRelativeTimeValue(aValue).includes('now');
}

/**
 * Normalizes relative-time input so the range guards can compare case-insensitively.
 * @param aValue The relative-time string to normalize.
 * @returns The lowercased relative-time string.
 */
function normalizeRelativeTimeValue(aValue: string): string {
    return aValue.toLowerCase();
}
