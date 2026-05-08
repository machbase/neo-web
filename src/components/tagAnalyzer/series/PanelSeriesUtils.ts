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
export function getSeriesShortName(seriesConfig: PanelSeriesDefinition): string {
    return formatSeriesLabel(seriesConfig, {
        target: 'short',
        raw: false,
    });
}
export function getSeriesEditorName(seriesConfig: PanelSeriesDefinition): string {
    return formatSeriesLabel(seriesConfig, {
        target: 'editor',
        raw: false,
    });
}
export function getSeriesName(
    seriesConfig: PanelSeriesDefinition,
    useRawLabel = false,
): string {
    return formatSeriesLabel(seriesConfig, {
        target: 'chart',
        raw: useRawLabel,
    });
}
export function getPanelSeriesDisplayColor(
    series: SeriesWithOptionalColor,
    seriesIndex: number,
): string {
    return series.color ?? getTagAnalyzerPaletteColor(seriesIndex);
}

function getTagAnalyzerPaletteColor(seriesIndex: number): string {
    return TAG_ANALYZER_LINE_COLORS[seriesIndex % TAG_ANALYZER_LINE_COLORS.length];
}
