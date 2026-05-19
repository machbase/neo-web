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

type SeriesWithOptionalColor = {
    color?: string | undefined;
};

export function getPanelSeriesDisplayColor(
    series: SeriesWithOptionalColor,
    seriesIndex: number,
): string {
    return series.color ?? TAG_ANALYZER_LINE_COLORS[seriesIndex % TAG_ANALYZER_LINE_COLORS.length];
}
