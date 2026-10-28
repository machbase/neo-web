import { resolveEchartsColor } from '@/design-system/theme';

/**
 * The Tag Analyzer chart's own colours under the app theme.
 *
 * chartOptions.ts writes the dark panel's colours as literals in module constants shared by every
 * option it builds. Rather than thread a palette through each builder, the finished option has
 * those literals swapped for what the theme's tokens resolve to — each token falls back to the
 * literal it replaces, so with no theme the option comes back unchanged. Series data and series
 * colours are content and are left alone.
 */
const TOKEN_FOR_LITERAL: Record<string, string> = {
    '#252525': 'var(--neo-bg-secondary, #252525)',
    '#323333': 'var(--neo-border-color-default, #323333)',
    '#f8f8f8': 'var(--neo-text-primary, #f8f8f8)',
    '#afb5bc': 'var(--neo-text-secondary, #afb5bc)',
    '#e7e8ea': 'var(--neo-text-primary, #e7e8ea)',
    '#1f1d1d': 'var(--neo-tooltip-bg, #1f1d1d)',
    '#292929': 'var(--neo-tooltip-border, #292929)',
    '#7a828c': 'var(--neo-border-color-medium, #7a828c)',
    '#8a939e': 'var(--neo-border-color-medium, #8a939e)',
    '#c0c7d0': 'var(--neo-text-disabled, #c0c7d0)',
    '#a8b0ba': 'var(--neo-text-disabled, #a8b0ba)',
    '#a8b3c1': 'var(--neo-text-tertiary, #a8b3c1)',
    '#7f8da0': 'var(--neo-text-tertiary, #7f8da0)',
    'rgba(104, 119, 138, 0.28)': 'color-mix(in srgb, var(--neo-primary-light, rgb(104, 119, 138)) 28%, transparent)',
    'rgba(245, 247, 250, 0.78)': 'color-mix(in srgb, var(--neo-bg-elevated, rgb(245, 247, 250)) 78%, transparent)',
    'rgba(245, 247, 250, 0.32)': 'color-mix(in srgb, var(--neo-bg-elevated, rgb(245, 247, 250)) 32%, transparent)',
};

/** Each literal the options use → its colour under the current theme (itself with no theme). */
export const resolveTagAnalyzerChartColors = (): Map<string, string> =>
    new Map(Object.entries(TOKEN_FOR_LITERAL).map(([aLiteral, aToken]) => [aLiteral, resolveEchartsColor(aToken, aLiteral)]));

const swapInHtml = (aHtml: string, aColors: Map<string, string>) =>
    aHtml.replace(/color:\s*(#[0-9a-fA-F]{6})/g, (aMatch, aHex: string) => {
        const sColor = aColors.get(aHex.toLowerCase());
        return sColor ? `color:${sColor}` : aMatch;
    });

/**
 * A copy of an ECharts option with the dark literals swapped for `aColors`. Shared constants are
 * never mutated; series `data` arrays are not walked; a tooltip formatter's inline colours are
 * swapped in the HTML it returns.
 */
export function recolorTagAnalyzerOption<T>(aOption: T, aColors: Map<string, string>): T {
    const sIdentity = [...aColors].every(([aLiteral, aColor]) => aLiteral === aColor);
    if (sIdentity) return aOption;
    const walk = (aValue: unknown, aKey?: string): unknown => {
        if (typeof aValue === 'string') return aColors.get(aValue) ?? aValue;
        if (typeof aValue === 'function') {
            if (aKey !== 'formatter') return aValue;
            const sFormatter = aValue as (...aArgs: unknown[]) => unknown;
            return (...aArgs: unknown[]) => {
                const sOut = sFormatter(...aArgs);
                return typeof sOut === 'string' ? swapInHtml(sOut, aColors) : sOut;
            };
        }
        if (Array.isArray(aValue)) return aKey === 'data' ? aValue : aValue.map((aItem) => walk(aItem));
        if (aValue && typeof aValue === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(aValue))) {
            const sOut: Record<string, unknown> = {};
            for (const [sKey, sItem] of Object.entries(aValue as Record<string, unknown>)) sOut[sKey] = walk(sItem, sKey);
            return sOut;
        }
        return aValue;
    };
    return walk(aOption) as T;
}
