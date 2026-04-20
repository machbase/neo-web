import {
    legacySeriesToChartPoints,
    normalizeLegacySeriesConfigs,
    normalizeLegacyTimeBoundaryRanges,
    normalizeLegacyChartSeries,
    normalizeSourceTagNames,
    toLegacyTagNameList,
} from './LegacyUtils';
import type { LegacyCompatibleSeriesConfig } from './LegacyTypes';

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

    describe('normalizeLegacySeriesConfigs', () => {
        it('defaults a missing legacy onRollup flag to false', () => {
            const sLegacySeriesConfig: LegacyCompatibleSeriesConfig = {
                key: 'tag-1',
                table: 'TABLE_A',
                sourceTagName: 'temp_sensor',
                alias: 'Temp Sensor',
                calculationMode: 'Raw',
                color: '#ff0000',
                use_y2: 'N',
                id: undefined,
                colName: undefined,
            };

            expect(normalizeLegacySeriesConfigs([sLegacySeriesConfig])).toEqual([
                {
                    key: 'tag-1',
                    table: 'TABLE_A',
                    sourceTagName: 'temp_sensor',
                    alias: 'Temp Sensor',
                    calculationMode: 'Raw',
                    color: '#ff0000',
                    use_y2: false,
                    id: undefined,
                    onRollup: false,
                    colName: undefined,
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

    describe('normalizeLegacyTimeBoundaryRanges', () => {
        it('converts legacy min/max payloads into the nested TagAnalyzer range shape', () => {
            expect(
                normalizeLegacyTimeBoundaryRanges({
                    bgn_min: 10,
                    bgn_max: 20,
                    end_min: 30,
                    end_max: 40,
                }),
            ).toEqual({
                start: { min: 10, max: 20 },
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
