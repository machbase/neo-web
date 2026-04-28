import type { PanelSeriesDefinition } from './PanelSeriesTypes';
import { getSourceTagName } from './PanelSeriesSourceTag';

type SeriesLabelTarget = 'short' | 'editor' | 'chart';

type SeriesLabelOptions = {
    target: SeriesLabelTarget;
    raw: boolean;
};

/**
 * Formats a panel series label for the requested display target.
 * Intent: Keep alias, editor, and chart label formatting aligned in one shared helper.
 *
 * @param seriesConfig The series config to format.
 * @param options The label target and raw-label options.
 * @returns The formatted series label.
 */
export function formatSeriesLabel(
    seriesConfig: PanelSeriesDefinition,
    options: SeriesLabelOptions,
): string {
    if (seriesConfig.alias) {
        return seriesConfig.alias;
    }

    const sSourceTagName = getSourceTagName(seriesConfig);

    switch (options.target) {
        case 'short':
            return sSourceTagName;
        case 'editor':
            return `${sSourceTagName}(${seriesConfig.calculationMode})`;
        case 'chart':
            return `${sSourceTagName}(${
                options.raw ? 'raw' : seriesConfig.calculationMode.toLowerCase()
            })`;
    }
}

/**
 * Gets the short label for a series.
 * Intent: Provide the compact label used in list and selection views.
 *
 * @param seriesConfig The series config to format.
 * @returns The short series label.
 */
export function getSeriesShortName(seriesConfig: PanelSeriesDefinition): string {
    return formatSeriesLabel(seriesConfig, {
        target: 'short',
        raw: false,
    });
}

/**
 * Gets the editor label for a series.
 * Intent: Provide the label shown in series-editing workflows.
 *
 * @param seriesConfig The series config to format.
 * @returns The editor series label.
 */
export function getSeriesEditorName(seriesConfig: PanelSeriesDefinition): string {
    return formatSeriesLabel(seriesConfig, {
        target: 'editor',
        raw: false,
    });
}

/**
 * Gets the chart label for a series.
 * Intent: Provide the display label used by chart rendering paths.
 *
 * @param seriesConfig The series config to format.
 * @param useRawLabel Whether to use the raw chart label variant.
 * @returns The chart series label.
 */
export function getSeriesName(
    seriesConfig: PanelSeriesDefinition,
    useRawLabel = false,
): string {
    return formatSeriesLabel(seriesConfig, {
        target: 'chart',
        raw: useRawLabel,
    });
}
