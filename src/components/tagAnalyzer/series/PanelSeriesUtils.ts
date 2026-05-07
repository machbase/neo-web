import type { PanelSeriesDefinition } from '../domain/SeriesModel';

export const TAG_ANALYZER_LINE_COLORS = [
    '#367FEB',
    '#EB5757',
    '#6FCF97',
    '#FFD95F',
    '#9C8FFF',
    '#F5AA64',
    '#BB6BD9',
    '#B4B4B4',
    '#2D9CDB',
    '#C3A080',
    '#C9C9C9',
    '#6B6B6B',
];

type SeriesLabelTarget = 'short' | 'editor' | 'chart';

type SeriesLabelOptions = {
    target: SeriesLabelTarget;
    raw: boolean;
};

type SeriesWithOptionalColor = {
    color?: string | undefined;
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

    const sSourceTagName = seriesConfig.sourceTagName;

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

/**
 * Resolves the visible TagAnalyzer line color for one series.
 * Intent: Keep stored colors optional while chart/editor display stays deterministic.
 *
 * @param series The series that may have a stored color override.
 * @param seriesIndex The series index used for palette fallback.
 * @returns The stored color, or the deterministic palette fallback.
 */
export function getPanelSeriesDisplayColor(
    series: SeriesWithOptionalColor,
    seriesIndex: number,
): string {
    return series.color ?? getTagAnalyzerPaletteColor(seriesIndex);
}

function getTagAnalyzerPaletteColor(seriesIndex: number): string {
    return TAG_ANALYZER_LINE_COLORS[seriesIndex % TAG_ANALYZER_LINE_COLORS.length];
}
