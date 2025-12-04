// Scale Formatter
// Handles formatting based on different scales (SI, IEC, dateTime, duration)

// Base units and scale factors for different scale types
const SCALE_CONFIG = {
    short: {
        scaleFactor: 1000,
        baseUnits: `['', 'K', 'Mil', 'Bil', 'Tri', 'Quadr', 'Quint', 'Sext', 'Sept', 'Oct', 'Non']`,
    },
    IEC: {
        scaleFactor: 1024,
        baseUnits: `['', 'Ki', 'Mi', 'Gi', 'Ti', 'Pi', 'Ei', 'Zi', 'Yi']`,
    },
    SI: {
        scaleFactor: 1000,
        baseUnits: `['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y']`,
    },
};

/**
 * Generates a eCharts formatter function string
 *
 * @param scaleType - Type of scale ('SI' | 'IEC' | 'short')
 * @param suffix - Custom suffix to append (e.g., 'B' for bytes, 'b' for bits)
 * @param decimals - Number of decimal places
 * @returns JavaScript function string for eCharts formatter
 */
export const generateScaleFormatterFunction = (scaleType: 'SI' | 'IEC' | 'short' = 'SI', suffix: string = '', decimals: number): string => {
    const config = SCALE_CONFIG[scaleType];
    return (
        `function (params) {` +
        `if (!+params) return '0';` +
        `const scaleFactor = ${config.scaleFactor};` +
        `const baseUnits = ${config.baseUnits};` +
        `const suffix = '${suffix}';` +
        `const decimals = ${decimals};` +
        `const sign = Math.sign(params) === -1 ? '-' : '';` +
        `const absValue = Math.abs(params);` +
        `let scale = 0;` +
        `let scaledValue = absValue;` +
        `while (scaledValue >= scaleFactor && scale < baseUnits.length - 1) {` +
        `scaledValue /= scaleFactor;` +
        `scale++;` +
        `}` +
        `const formattedValue = decimals >= 0 ? scaledValue.toFixed(decimals) : scaledValue;` +
        `const unit = baseUnits[scale] + suffix;` +
        `return sign + formattedValue + (unit ? ' ' + unit : '');` +
        `}`
    );
};

/**
 * Generates time formatter function string for eCharts
 * Formats time value with sourceScale conversion and suffix (Grafana-style)
 * Displays up to years (y, M, w, d, h, mins, s, ms, us, ns)
 * @param sourceScale - Conversion factor to seconds (e.g., 1 for seconds, 0.001 for milliseconds)
 *   Multiply input value by sourceScale to convert to seconds
 * @param suffix - Custom suffix to append (overrides auto-detection)
 * @param decimals - Number of decimal places to display
 * @returns JavaScript function string for eCharts formatter
 */
export const generateTimeFormatterFunction = (sourceScale: number = 1, suffix: string = '', decimals?: number): string => {
    // sourceScale is a multiplier to convert input to seconds
    // sourceScale = 1 (input is already in seconds)
    // sourceScale = 0.001 (input in milliseconds: params * 0.001 = seconds)
    // sourceScale = 0.000001 (input in microseconds: params * 0.000001 = seconds)
    // sourceScale = 0.000000001 (input in nanoseconds: params * 0.000000001 = seconds)

    return (
        `function (params) {` +
        `if (!+params) return '0 ';` +
        `const sourceScale = ${sourceScale};` +
        `const suffix = '${suffix}';` +
        `const decimals = ${decimals};` +
        `const seconds = params * sourceScale;` +
        `const absSeconds = Math.abs(seconds);` +
        `const sign = seconds < 0 ? '-' : '';` +
        `let displayValue = absSeconds;` +
        `let unit = 's';` +
        `if (absSeconds >= 31536000) {` +
        `displayValue = absSeconds / 31536000;` +
        `unit = 'y';` +
        `} else if (absSeconds >= 2592000) {` +
        `displayValue = absSeconds / 2592000;` +
        `unit = 'M';` +
        `} else if (absSeconds >= 604800) {` +
        `displayValue = absSeconds / 604800;` +
        `unit = 'w';` +
        `} else if (absSeconds >= 86400) {` +
        `displayValue = absSeconds / 86400;` +
        `unit = 'd';` +
        `} else if (absSeconds >= 3600) {` +
        `displayValue = absSeconds / 3600;` +
        `unit = 'h';` +
        `} else if (absSeconds >= 60) {` +
        `displayValue = absSeconds / 60;` +
        `unit = 'mins';` +
        `} else if (absSeconds >= 1) {` +
        `displayValue = absSeconds;` +
        `unit = 's';` +
        `} else if (absSeconds >= 0.001) {` +
        `displayValue = absSeconds * 1000;` +
        `unit = 'ms';` +
        `} else if (absSeconds >= 0.000001) {` +
        `displayValue = absSeconds * 1000000;` +
        `unit = 'us';` +
        `} else {` +
        `displayValue = absSeconds * 1000000000;` +
        `unit = 'ns';` +
        `}` +
        `const formatted = decimals >= 0 ? displayValue.toFixed(decimals) : displayValue;` +
        `const finalSuffix = suffix || unit;` +
        `return sign + formatted + ' ' + finalSuffix;` +
        `}`
    );
};

/**
 * Generates duration formatter function string for eCharts
 * Formats duration with different output formats
 * @param formatType - Format type ('duration' | 'duration_h' | 'duration_d')
 *   - 'duration': Simple format (h, m, s, ms, μs, ns)
 *   - 'duration_h': HH:MM:SS format
 *   - 'duration_d': DD HH:MM:SS format
 * @param decimals - Number of decimal places
 * @param sourceScaleToMs - Scale factor to convert input data to milliseconds
 * @returns JavaScript function string for eCharts formatter
 */
export const generateDurationFormatterFunction = (formatType: string = 'duration', decimals?: number, sourceScaleToMs: number = 1): string => {
    // Default decimals: 0 if empty/undefined
    // HH:MM:SS format (for duration_h)
    if (formatType === 'duration_h') {
        return (
            `function (params) {` +
            `if (!+params) return '00:00:00';` +
            `const ms = params * ${sourceScaleToMs};` +
            `const totalSeconds = Math.floor(Math.abs(ms) / 1000);` +
            `const sign = ms < 0 ? '-' : '';` +
            `const hours = Math.floor(totalSeconds / 3600);` +
            `const minutes = Math.floor((totalSeconds % 3600) / 60);` +
            `const seconds = totalSeconds % 60;` +
            `const hh = String(hours).padStart(2, '0');` +
            `const mm = String(minutes).padStart(2, '0');` +
            `const ss = String(seconds).padStart(2, '0');` +
            `return sign + hh + ':' + mm + ':' + ss;` +
            `}`
        );
    }

    // DD HH:MM:SS format (for duration_d)
    if (formatType === 'duration_d') {
        return (
            `function (params) {` +
            `if (!+params) return '00:00:00';` +
            `const ms = params * ${sourceScaleToMs};` +
            `const totalSeconds = Math.floor(Math.abs(ms) / 1000);` +
            `const sign = ms < 0 ? '-' : '';` +
            `const days = Math.floor(totalSeconds / 86400);` +
            `const hours = Math.floor((totalSeconds % 86400) / 3600);` +
            `const minutes = Math.floor((totalSeconds % 3600) / 60);` +
            `const seconds = totalSeconds % 60;` +
            `const hh = String(hours).padStart(2, '0');` +
            `const mm = String(minutes).padStart(2, '0');` +
            `const ss = String(seconds).padStart(2, '0');` +
            `if (days > 0) {` +
            `const dd = String(days).padStart(2, '0');` +
            `return sign + dd + ' d ' + hh + ':' + mm + ':' + ss;` +
            `}` +
            `return sign + hh + ':' + mm + ':' + ss;` +
            `}`
        );
    }

    // Simple format (for duration): s, m, h, d, w, M, y
    return (
        `function (params) {` +
        `if (!+params) return '0s';` +
        `const ms = params * ${sourceScaleToMs};` +
        `const absMs = Math.abs(ms);` +
        `const sign = ms < 0 ? '-' : '';` +
        `const seconds = absMs / 1000;` +
        `const isSmallUnit = ${sourceScaleToMs} < 1;` +
        `const minutes = seconds / 60;` +
        `const hours = minutes / 60;` +
        `const days = hours / 24;` +
        `const weeks = days / 7;` +
        `const months = days / 30.44;` +
        `const years = days / 365.25;` +
        `const decimals = ${decimals};` +
        `const showAll = decimals === undefined;` +
        `const u = ['y', 'M', 'w', 'd', 'h', 'm', 's'];` +
        `if (years >= 1) {` +
        `const y = Math.floor(years);` +
        `const remM = (years - y) * 12;` +
        `const M = Math.floor(remM);` +
        `const remW = (remM - M) * 4.345;` +
        `const w = Math.floor(remW);` +
        `let r = y + 'y';` +
        `if ((showAll || decimals >= 1) && M > 0) r += ' ' + M + 'M';` +
        `if ((showAll || decimals >= 2) && w > 0) r += ' ' + w + 'w';` +
        `return sign + r;` +
        `}` +
        `if (months >= 1) {` +
        `const M = Math.floor(months);` +
        `const remW = (months - M) * 4.345;` +
        `const w = Math.floor(remW);` +
        `const remD = (remW - w) * 7;` +
        `const d = Math.floor(remD);` +
        `let r = M + 'M';` +
        `if ((showAll || decimals >= 1) && w > 0) r += ' ' + w + 'w';` +
        `if ((showAll || decimals >= 2) && d > 0) r += ' ' + d + 'd';` +
        `return sign + r;` +
        `}` +
        `if (weeks >= 1) {` +
        `const w = Math.floor(weeks);` +
        `const remD = (weeks - w) * 7;` +
        `const d = Math.floor(remD);` +
        `const remH = (remD - d) * 24;` +
        `const h = Math.floor(remH);` +
        `const remM = (remH - h) * 60;` +
        `const m = Math.floor(remM);` +
        `const s = Math.floor((remM - m) * 60);` +
        `let r = w + 'w';` +
        `if ((showAll || decimals >= 1) && d > 0) r += ' ' + d + 'd';` +
        `if ((showAll || decimals >= 2) && h > 0) r += ' ' + h + 'h';` +
        `if ((showAll || decimals >= 3) && m > 0) r += ' ' + m + 'm';` +
        `if ((showAll || decimals >= 4) && s > 0) r += ' ' + s + 's';` +
        `return sign + r;` +
        `}` +
        `if (days >= 1) {` +
        `const d = Math.floor(days);` +
        `const remH = (days - d) * 24;` +
        `const h = Math.floor(remH);` +
        `const remM = (remH - h) * 60;` +
        `const m = Math.floor(remM);` +
        `const remS = (remM - m) * 60;` +
        `const s = Math.floor(remS);` +
        `const remMs = (remS - s) * 1000;` +
        `const ms = Math.floor(remMs);` +
        `let r = d + 'd';` +
        `if ((showAll || decimals >= 1) && h > 0) r += ' ' + h + 'h';` +
        `if ((showAll || decimals >= 2) && m > 0) r += ' ' + m + 'm';` +
        `if ((showAll || decimals >= 3) && s > 0) r += ' ' + s + 's';` +
        `if ((showAll || decimals >= 4) && ms > 0) r += ' ' + ms + 'ms';` +
        `return sign + r;` +
        `}` +
        `if (hours >= 1) {` +
        `const h = Math.floor(hours);` +
        `const remM = (hours - h) * 60;` +
        `const m = Math.floor(remM);` +
        `const remS = (remM - m) * 60;` +
        `const s = Math.floor(remS);` +
        `const remMs = (remS - s) * 1000;` +
        `const ms = Math.floor(remMs);` +
        `let r = h + 'h';` +
        `if ((showAll || decimals >= 1) && m > 0) r += ' ' + m + 'm';` +
        `if ((showAll || decimals >= 2) && s > 0) r += ' ' + s + 's';` +
        `if ((showAll || decimals >= 3) && ms > 0) r += ' ' + ms + 'ms';` +
        `return sign + r;` +
        `}` +
        `if (minutes >= 1) {` +
        `const m = Math.floor(minutes);` +
        `const remS = (minutes - m) * 60;` +
        `const s = Math.floor(remS);` +
        `const remMs = (remS - s) * 1000;` +
        `const ms = Math.floor(remMs);` +
        `let r = m + 'm';` +
        `if ((showAll || decimals >= 1) && s > 0) r += ' ' + s + 's';` +
        `if ((showAll || decimals >= 2) && ms > 0) r += ' ' + ms + 'ms';` +
        `return sign + r;` +
        `}` +
        `if (seconds >= 1) {` +
        `const s = Math.floor(seconds);` +
        `const remMs = (seconds - s) * 1000;` +
        `const ms = Math.floor(remMs);` +
        `const remUs = (remMs - ms) * 1000;` +
        `const us = Math.floor(remUs);` +
        `let r = s + 's';` +
        `if ((showAll || decimals >= 1) && isSmallUnit && ms > 0) r += ' ' + ms + 'ms';` +
        `if ((showAll || decimals >= 2) && isSmallUnit && us > 0) r += ' ' + us + 'us';` +
        `return sign + r;` +
        `}` +
        `if (absMs >= 1) {` +
        `const ms = Math.floor(absMs);` +
        `const remUs = (absMs - ms) * 1000;` +
        `const us = Math.floor(remUs);` +
        `const remNs = (remUs - us) * 1000;` +
        `const ns = Math.floor(remNs);` +
        `let r = ms + 'ms';` +
        `if (isSmallUnit && (showAll || decimals >= 1) && us > 0) r += ' ' + us + 'us';` +
        `if (isSmallUnit && (showAll || decimals >= 2) && ns > 0) r += ' ' + ns + 'ns';` +
        `return sign + r;` +
        `}` +
        `if (isSmallUnit) {` +
        `const us = absMs * 1000;` +
        `return sign + us.toFixed(0) + 'us';` +
        `}` +
        `return '0s';` +
        `}`
    );
};

export const generateStringFormatterFunction = (sourceScale: number = 1, suffix: string, decimals?: number): string => {
    return `function (params) { return (params / ${sourceScale})${decimals !== undefined && decimals >= 0 ? `.toFixed(${decimals})` : ''} + ' ${suffix ?? ''}'}`;
};
