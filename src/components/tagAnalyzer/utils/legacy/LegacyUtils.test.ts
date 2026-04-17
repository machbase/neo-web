import {
    legacySeriesToChartPoints,
    normalizeLegacyBgnEndTimeRange,
    normalizeLegacyChartSeries,
    normalizeSourceTagNames,
    toLegacyTagNameList,
} from './LegacyUtils';

describe('LegacyUtils', () => {
    describe('normalizeSourceTagNames', () => {
        it('upgrades legacy tagName items into sourceTagName-only items', () => {
            expect(
                normalizeSourceTagNames([
                    {
                        key: 'tag-1',
                        table: 'TABLE_A',
                        tagName: 'legacy_sensor',
                    },
                ]),
            ).toEqual([
                {
                    key: 'tag-1',
                    table: 'TABLE_A',
                    sourceTagName: 'legacy_sensor',
                },
            ]);
        });
    });

    describe('toLegacyTagNameList', () => {
        it('recreates tagName only when leaving the normalized boundary', () => {
            const sLegacyItems = toLegacyTagNameList([
                {
                    key: 'tag-1',
                    table: 'TABLE_A',
                    sourceTagName: 'temp_sensor',
                },
            ]);

            expect(sLegacyItems).toEqual([
                {
                    key: 'tag-1',
                    table: 'TABLE_A',
                    tagName: 'temp_sensor',
                },
            ]);
            expect(sLegacyItems[0]).not.toHaveProperty('sourceTagName');
        });
    });

    describe('normalizeLegacyBgnEndTimeRange', () => {
        it('converts legacy min/max payloads into the nested TagAnalyzer range shape', () => {
            expect(
                normalizeLegacyBgnEndTimeRange({
                    bgn_min: 10,
                    bgn_max: 20,
                    end_min: 30,
                    end_max: 40,
                }),
            ).toEqual({
                bgn: { min: 10, max: 20 },
                end: { min: 30, max: 40 },
            });
        });
    });

    describe('legacy chart series adapters', () => {
        it('converts split xData and yData arrays into tuple-based chart data', () => {
            expect(
                normalizeLegacyChartSeries({
                    data: [],
                    xData: [100, 200, 300],
                    yData: [1, 2, 3],
                }),
            ).toEqual({
                data: [
                    [100, 1],
                    [200, 2],
                    [300, 3],
                ],
            });
        });

        it('converts tuple-based chart data into chart points', () => {
            expect(
                legacySeriesToChartPoints({
                    data: [
                        [100, 1],
                        [200, 2],
                    ],
                }),
            ).toEqual([
                { x: 100, y: 1 },
                { x: 200, y: 2 },
            ]);
        });
    });
});
