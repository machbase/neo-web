import type { SeriesConfig } from './seriesTypes';
import { getSourceTagName } from '../legacy/LegacySeriesAdapter';

type SeriesLabelTarget = 'short' | 'editor' | 'chart';

type SeriesLabelOptions = {
    target: SeriesLabelTarget;
    raw?: boolean;
};

/**
 * Formats a series label for the requested display target.
 * Intent: Keep alias, editor, and chart label formatting aligned in one shared helper.
 *
 * @param aSeriesConfig The series config to format.
 * @param aOptions The label target and raw-label options.
 * @returns The formatted series label.
 */
export function formatSeriesLabel(
    aSeriesConfig: SeriesConfig,
    aOptions: SeriesLabelOptions,
): string {
    if (aSeriesConfig.alias) {
        return aSeriesConfig.alias;
    }

    const sSourceTagName = getSourceTagName(aSeriesConfig);

    switch (aOptions.target) {
        case 'short':
            return sSourceTagName;
        case 'editor':
            return `${sSourceTagName}(${aSeriesConfig.calculationMode})`;
        case 'chart':
            return `${sSourceTagName}(${
                aOptions.raw ? 'raw' : aSeriesConfig.calculationMode.toLowerCase()
            })`;
    }
}

/**
 * Gets the short label for a series.
 * Intent: Provide the compact label used in list and selection views.
 *
 * @param aSeriesConfig The series config to format.
 * @returns The short series label.
 */
export function getSeriesShortName(aSeriesConfig: SeriesConfig): string {
    return formatSeriesLabel(aSeriesConfig, { target: 'short' });
}

/**
 * Gets the editor label for a series.
 * Intent: Provide the label shown in series-editing workflows.
 *
 * @param aSeriesConfig The series config to format.
 * @returns The editor series label.
 */
export function getSeriesEditorName(aSeriesConfig: SeriesConfig): string {
    return formatSeriesLabel(aSeriesConfig, { target: 'editor' });
}

/**
 * Gets the chart label for a series.
 * Intent: Provide the display label used by chart rendering paths.
 *
 * @param aSeriesConfig The series config to format.
 * @param aUseRawLabel Whether to use the raw chart label variant.
 * @returns The chart series label.
 */
export function getSeriesName(
    aSeriesConfig: SeriesConfig,
    aUseRawLabel = false,
): string {
    return formatSeriesLabel(aSeriesConfig, {
        target: 'chart',
        raw: aUseRawLabel,
    });
}
