import type { SeriesConfig } from './ModelTypes';
import { getSourceTagName } from './legacy/LegacyUtils';

/**
 * Returns the shortest display label for one series, preferring aliases when present.
 * @param aSeriesConfig The saved series config.
 * @returns The alias or normalized source tag name.
 */
export function getSeriesShortName(aSeriesConfig: SeriesConfig): string {
    return aSeriesConfig.alias || getSourceTagName(aSeriesConfig);
}

/**
 * Returns the editor-facing series label with the original calculation-mode text.
 * @param aSeriesConfig The saved series config.
 * @returns The editor label for the series.
 */
export function getSeriesEditorName(aSeriesConfig: SeriesConfig): string {
    if (aSeriesConfig.alias) {
        return aSeriesConfig.alias;
    }

    return `${getSourceTagName(aSeriesConfig)}(${aSeriesConfig.calculationMode})`;
}

/**
 * Returns the chart-facing series label with a normalized calculation-mode suffix.
 * @param aSeriesConfig The saved series config.
 * @param aUseRawLabel Whether the raw-series suffix should be forced.
 * @returns The chart label for the series.
 */
export function getSeriesName(
    aSeriesConfig: SeriesConfig,
    aUseRawLabel = false,
): string {
    if (aSeriesConfig.alias) {
        return aSeriesConfig.alias;
    }

    return `${getSourceTagName(aSeriesConfig)}(${aUseRawLabel ? 'raw' : aSeriesConfig.calculationMode.toLowerCase()})`;
}
