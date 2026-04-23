import {
    toLegacyFlatPanelInfo,
} from './LegacyFlatPanelMapper';
import { createTagAnalyzerBoardSourceInfoFixture } from '../../../TestData/PanelTestData';
import type { LegacyFlatPanelInfo } from './LegacyFlatPanelTypes';
import type { PanelAxes } from '../../panelModelTypes';
import { normalizeLegacyTimeRangeBoundary } from '../../legacy/LegacyTimeAdapter';
import { parseReceivedBoardInfo } from '../TazBoardInfoParser';

/**
 * Normalizes a legacy flat panel through a temporary board fixture.
 * Intent: Exercise the storage adapter through the same board-level path the app uses.
 * @param {LegacyFlatPanelInfo} aPanelInfo - The legacy flat panel fixture to normalize.
 * @returns The normalized panel from the board fixture.
 */
function normalizeLegacyPanelInfoForTest(aPanelInfo: LegacyFlatPanelInfo) {
    return parseReceivedBoardInfo(
        createTagAnalyzerBoardSourceInfoFixture({
            panels: [aPanelInfo],
            range_bgn: 0,
            range_end: 100,
        }),
    ).panels[0];
}

function createRuntimeAxes(
    aRawDataPixelsPerTick: number,
    aCalculatedDataPixelsPerTick: number,
): PanelAxes {
    return {
        x_axis: {
            show_tickline: false,
            raw_data_pixels_per_tick: aRawDataPixelsPerTick,
            calculated_data_pixels_per_tick: aCalculatedDataPixelsPerTick,
        },
        sampling: {
            enabled: false,
            sample_count: 0,
        },
        left_y_axis: {
            zero_base: false,
            show_tickline: false,
            value_range: { min: 0, max: 0 },
            raw_data_value_range: { min: 0, max: 0 },
            upper_control_limit: { enabled: false, value: 0 },
            lower_control_limit: { enabled: false, value: 0 },
        },
        right_y_axis: {
            enabled: false,
            zero_base: false,
            show_tickline: false,
            value_range: { min: 0, max: 0 },
            raw_data_value_range: { min: 0, max: 0 },
            upper_control_limit: { enabled: false, value: 0 },
            lower_control_limit: { enabled: false, value: 0 },
        },
    };
}

describe('PanelInfoConversion', () => {
    describe('normalized panel conversion', () => {
        it('round-trips nested panel info through flat conversion without changing its visible shape', () => {
            const sRangeConfig = normalizeLegacyTimeRangeBoundary(0, 100).rangeConfig;
            const nestedPanelInfo = {
                meta: {
                    index_key: 'panel-1',
                    chart_title: 'Panel 1',
                },
                data: {
                    tag_set: [],
                    raw_keeper: false,
                    count: 0,
                    interval_type: '',
                },
                time: {
                    range_bgn: 0,
                    range_end: 100,
                    range_config: sRangeConfig,
                    use_time_keeper: false,
                    time_keeper: undefined,
                    default_range: { min: 0, max: 100 },
                },
                axes: createRuntimeAxes(1, 1),
                display: {
                    show_legend: false,
                    use_zoom: false,
                    chart_type: 'Line',
                    show_point: false,
                    point_radius: 0,
                    fill: 0,
                    stroke: 0,
                },
                use_normalize: true,
                highlights: [],
            } as any;

            expect(
                normalizeLegacyPanelInfoForTest(toLegacyFlatPanelInfo(nestedPanelInfo)),
            ).toEqual(nestedPanelInfo);
        });

        it('normalizes the legacy flat panel shape before grouping it into the nested model', () => {
            const legacyPanelInfo = {
                index_key: 'panel-legacy',
                chart_title: 'Legacy Panel',
                tag_set: [
                    {
                        key: 'tag-1',
                        table: 'TABLE_A',
                        tagName: 'legacy_sensor',
                        alias: '',
                        calculationMode: 'avg',
                        color: '#ffffff',
                        use_y2: 'N',
                    },
                ],
                range_bgn: 0,
                range_end: 100,
                raw_keeper: false,
                time_keeper: '',
                default_range: { min: 0, max: 100 },
                count: 0,
                interval_type: '',
                show_legend: 'N',
                use_zoom: 'N',
                use_time_keeper: 'N',
                show_x_tickline: 'N',
                pixels_per_tick_raw: 1,
                pixels_per_tick: 1,
                use_sampling: false,
                sampling_value: 0,
                zero_base: 'N',
                show_y_tickline: 'N',
                custom_min: 0,
                custom_max: 0,
                custom_drilldown_min: 0,
                custom_drilldown_max: 0,
                use_ucl: 'N',
                ucl_value: 0,
                use_lcl: 'N',
                lcl_value: 0,
                use_right_y2: 'N',
                zero_base2: 'N',
                show_y_tickline2: 'N',
                custom_min2: 0,
                custom_max2: 0,
                custom_drilldown_min2: 0,
                custom_drilldown_max2: 0,
                use_ucl2: 'N',
                ucl2_value: 0,
                use_lcl2: 'N',
                lcl2_value: 0,
                chart_type: 'Line',
                show_point: 'N',
                point_radius: 0,
                fill: 0,
                stroke: 0,
                use_normalize: 'N',
            } as any;

            const sPanelInfo = normalizeLegacyPanelInfoForTest(legacyPanelInfo);

            expect(sPanelInfo.display.show_legend).toBe(false);
            expect(sPanelInfo.display.use_zoom).toBe(false);
            expect(sPanelInfo.time.use_time_keeper).toBe(false);
            expect(sPanelInfo.axes.x_axis.raw_data_pixels_per_tick).toBe(1);
            expect(sPanelInfo.axes.left_y_axis.value_range.min).toBe(0);
            expect(sPanelInfo.display.point_radius).toBe(0);
            expect(sPanelInfo.time.time_keeper).toBeUndefined();
            expect(sPanelInfo.data.tag_set).toEqual([
                expect.objectContaining({
                    key: 'tag-1',
                    table: 'TABLE_A',
                    sourceTagName: 'legacy_sensor',
                }),
            ]);
            expect(sPanelInfo.data.tag_set[0]).not.toHaveProperty('tagName');
            expect(sPanelInfo.data.tag_set[0].useRollupTable).toBe(false);
            expect(sPanelInfo.data.tag_set[0].annotations).toEqual([]);
            expect(sPanelInfo.highlights).toEqual([]);
        });

        it('defaults an undefined legacy raw_keeper flag to false in the nested model', () => {
            const legacyPanelInfo = {
                index_key: 'panel-raw-default',
                chart_title: 'Panel Raw Default',
                tag_set: [],
                range_bgn: 0,
                range_end: 100,
                raw_keeper: undefined,
                time_keeper: undefined,
                default_range: { min: 0, max: 100 },
                count: 0,
                interval_type: '',
                show_legend: 'N',
                use_zoom: 'N',
                use_time_keeper: 'N',
                show_x_tickline: 'N',
                pixels_per_tick_raw: 1,
                pixels_per_tick: 1,
                use_sampling: false,
                sampling_value: 0,
                zero_base: 'N',
                show_y_tickline: 'N',
                custom_min: 0,
                custom_max: 0,
                custom_drilldown_min: 0,
                custom_drilldown_max: 0,
                use_ucl: 'N',
                ucl_value: 0,
                use_lcl: 'N',
                lcl_value: 0,
                use_right_y2: 'N',
                zero_base2: 'N',
                show_y_tickline2: 'N',
                custom_min2: 0,
                custom_max2: 0,
                custom_drilldown_min2: 0,
                custom_drilldown_max2: 0,
                use_ucl2: 'N',
                ucl2_value: 0,
                use_lcl2: 'N',
                lcl2_value: 0,
                chart_type: 'Line',
                show_point: 'N',
                point_radius: 0,
                fill: 0,
                stroke: 0,
                use_normalize: 'N',
            } as any;

            expect(normalizeLegacyPanelInfoForTest(legacyPanelInfo).data.raw_keeper).toBe(false);
        });

        it('defaults an undefined legacy count to -1 in the nested model', () => {
            const legacyPanelInfo = {
                index_key: 'panel-count-default',
                chart_title: 'Panel Count Default',
                tag_set: [],
                range_bgn: 0,
                range_end: 100,
                raw_keeper: false,
                time_keeper: undefined,
                default_range: { min: 0, max: 100 },
                count: undefined,
                interval_type: '',
                show_legend: 'N',
                use_zoom: 'N',
                use_time_keeper: 'N',
                show_x_tickline: 'N',
                pixels_per_tick_raw: 1,
                pixels_per_tick: 1,
                use_sampling: false,
                sampling_value: 0,
                zero_base: 'N',
                show_y_tickline: 'N',
                custom_min: 0,
                custom_max: 0,
                custom_drilldown_min: 0,
                custom_drilldown_max: 0,
                use_ucl: 'N',
                ucl_value: 0,
                use_lcl: 'N',
                lcl_value: 0,
                use_right_y2: 'N',
                zero_base2: 'N',
                show_y_tickline2: 'N',
                custom_min2: 0,
                custom_max2: 0,
                custom_drilldown_min2: 0,
                custom_drilldown_max2: 0,
                use_ucl2: 'N',
                ucl2_value: 0,
                use_lcl2: 'N',
                lcl2_value: 0,
                chart_type: 'Line',
                show_point: 'N',
                point_radius: 0,
                fill: 0,
                stroke: 0,
                use_normalize: 'N',
            } as any;

            expect(normalizeLegacyPanelInfoForTest(legacyPanelInfo).data.count).toBe(-1);
        });

        it('groups the legacy flat panel shape into the nested model', () => {
            const sRangeConfig = normalizeLegacyTimeRangeBoundary(0, 100).rangeConfig;
            const legacyPanelInfo = {
                index_key: 'panel-1',
                chart_title: 'Panel 1',
                tag_set: [],
                range_bgn: 0,
                range_end: 100,
                range_config: sRangeConfig,
                raw_keeper: false,
                time_keeper: undefined,
                default_range: { min: 0, max: 100 },
                count: 0,
                interval_type: '',
                show_legend: 'N',
                use_zoom: 'N',
                use_time_keeper: 'N',
                show_x_tickline: 'N',
                pixels_per_tick_raw: 12,
                pixels_per_tick: 24,
                use_sampling: false,
                sampling_value: 0,
                zero_base: 'N',
                show_y_tickline: 'N',
                custom_min: 0,
                custom_max: 0,
                custom_drilldown_min: 0,
                custom_drilldown_max: 0,
                use_ucl: 'N',
                ucl_value: 0,
                use_lcl: 'N',
                lcl_value: 0,
                use_right_y2: 'N',
                zero_base2: 'N',
                show_y_tickline2: 'N',
                custom_min2: 0,
                custom_max2: 0,
                custom_drilldown_min2: 0,
                custom_drilldown_max2: 0,
                use_ucl2: 'N',
                ucl2_value: 0,
                use_lcl2: 'N',
                lcl2_value: 0,
                chart_type: 'Line',
                show_point: 'N',
                point_radius: 3,
                fill: 0,
                stroke: 0,
                use_normalize: 'N',
            } as any;

            expect(normalizeLegacyPanelInfoForTest(legacyPanelInfo)).toEqual({
                meta: {
                    index_key: 'panel-1',
                    chart_title: 'Panel 1',
                },
                data: {
                    tag_set: [],
                    raw_keeper: false,
                    count: 0,
                    interval_type: '',
                },
                time: {
                    range_bgn: 0,
                    range_end: 100,
                    range_config: sRangeConfig,
                    use_time_keeper: false,
                    time_keeper: undefined,
                    default_range: { min: 0, max: 100 },
                },
                axes: createRuntimeAxes(12, 24),
                display: {
                    show_legend: false,
                    use_zoom: false,
                    chart_type: 'Line',
                    show_point: false,
                    point_radius: 3,
                    fill: 0,
                    stroke: 0,
                },
                use_normalize: false,
                highlights: [],
            });
        });
    });

    describe('toLegacyFlatPanelInfo', () => {
        it('converts nested panel info into the legacy flat shape', () => {
            const sRangeConfig = normalizeLegacyTimeRangeBoundary(0, 100).rangeConfig;
            const panelInfo = {
                meta: {
                    index_key: 'panel-1',
                    chart_title: 'Panel 1',
                },
                data: {
                    tag_set: [],
                    raw_keeper: false,
                    count: 0,
                    interval_type: '',
                },
                time: {
                    range_bgn: 0,
                    range_end: 100,
                    range_config: sRangeConfig,
                    use_time_keeper: false,
                    time_keeper: undefined,
                    default_range: { min: 0, max: 100 },
                },
                axes: createRuntimeAxes(12, 24),
                display: {
                    show_legend: false,
                    use_zoom: false,
                    chart_type: 'Line',
                    show_point: false,
                    point_radius: 3,
                    fill: 0,
                    stroke: 0,
                },
                use_normalize: true,
            } as any;

            expect(toLegacyFlatPanelInfo(panelInfo)).toEqual({
                index_key: 'panel-1',
                chart_title: 'Panel 1',
                tag_set: [],
                range_bgn: 0,
                range_end: 100,
                raw_keeper: false,
                time_keeper: undefined,
                default_range: { min: 0, max: 100 },
                count: 0,
                interval_type: '',
                show_legend: 'N',
                use_zoom: 'N',
                use_normalize: 'Y',
                use_time_keeper: 'N',
                show_x_tickline: 'N',
                pixels_per_tick_raw: 12,
                pixels_per_tick: 24,
                use_sampling: false,
                sampling_value: 0,
                zero_base: 'N',
                show_y_tickline: 'N',
                custom_min: 0,
                custom_max: 0,
                custom_drilldown_min: 0,
                custom_drilldown_max: 0,
                use_ucl: 'N',
                ucl_value: 0,
                use_lcl: 'N',
                lcl_value: 0,
                use_right_y2: 'N',
                zero_base2: 'N',
                show_y_tickline2: 'N',
                custom_min2: 0,
                custom_max2: 0,
                custom_drilldown_min2: 0,
                custom_drilldown_max2: 0,
                use_ucl2: 'N',
                ucl2_value: 0,
                use_lcl2: 'N',
                lcl2_value: 0,
                chart_type: 'Line',
                show_point: 'N',
                point_radius: 3,
                fill: 0,
                stroke: 0,
            });
        });

        it('recreates legacy storage values only at the legacy boundary', () => {
            const sRangeConfig = normalizeLegacyTimeRangeBoundary(0, 100).rangeConfig;
            const nestedPanelInfo = {
                meta: {
                    index_key: 'panel-tag',
                    chart_title: 'Panel Tag',
                },
                data: {
                    tag_set: [
                        {
                            key: 'tag-1',
                            table: 'TABLE_A',
                            sourceTagName: 'temp_sensor',
                            alias: '',
                            calculationMode: 'avg',
                            color: '#ffffff',
                            useSecondaryAxis: false,
                        },
                    ],
                    raw_keeper: false,
                    count: 0,
                    interval_type: '',
                },
                time: {
                    range_bgn: 0,
                    range_end: 100,
                    range_config: sRangeConfig,
                    use_time_keeper: false,
                    time_keeper: undefined,
                    default_range: { min: 0, max: 100 },
                },
                axes: createRuntimeAxes(12, 24),
                display: {
                    show_legend: false,
                    use_zoom: false,
                    chart_type: 'Line',
                    show_point: false,
                    point_radius: 3,
                    fill: 0,
                    stroke: 0,
                },
                use_normalize: false,
            } as any;

            const sFlattenedPanel = toLegacyFlatPanelInfo(nestedPanelInfo);

            expect(sFlattenedPanel.tag_set).toEqual([
                expect.objectContaining({
                    key: 'tag-1',
                    table: 'TABLE_A',
                    tagName: 'temp_sensor',
                }),
            ]);
            expect(sFlattenedPanel.tag_set[0]).not.toHaveProperty('sourceTagName');
            expect(sFlattenedPanel.show_legend).toBe('N');
            expect(sFlattenedPanel.show_point).toBe('N');
        });

        it('normalizes legacy input and groups it into the nested model in one step', () => {
            const sLegacyPanelInfo = {
                index_key: 'panel-default-normalize',
                chart_title: 'Panel Default Normalize',
                tag_set: [],
                range_bgn: 0,
                range_end: 100,
                raw_keeper: false,
                time_keeper: '',
                default_range: { min: 0, max: 100 },
                count: 0,
                interval_type: '',
                show_legend: 'N',
                use_zoom: 'N',
                use_time_keeper: 'N',
                show_x_tickline: 'N',
                pixels_per_tick_raw: '12',
                pixels_per_tick: '24',
                use_sampling: false,
                sampling_value: '0',
                zero_base: 'N',
                show_y_tickline: 'N',
                custom_min: '',
                custom_max: '',
                custom_drilldown_min: '',
                custom_drilldown_max: '',
                use_ucl: 'N',
                ucl_value: '',
                use_lcl: 'N',
                lcl_value: '',
                use_right_y2: 'N',
                zero_base2: 'N',
                show_y_tickline2: 'N',
                custom_min2: '',
                custom_max2: '',
                custom_drilldown_min2: '',
                custom_drilldown_max2: '',
                use_ucl2: 'N',
                ucl2_value: '',
                use_lcl2: 'N',
                lcl2_value: '',
                chart_type: 'Line',
                show_point: 'N',
                point_radius: '3',
                fill: '0',
                stroke: '0',
                use_normalize: undefined,
            } as any;

            expect(normalizeLegacyPanelInfoForTest(sLegacyPanelInfo)).toEqual({
                meta: {
                    index_key: 'panel-default-normalize',
                    chart_title: 'Panel Default Normalize',
                },
                data: {
                    tag_set: [],
                    raw_keeper: false,
                    count: 0,
                    interval_type: '',
                },
                time: {
                    range_bgn: 0,
                    range_end: 100,
                    range_config: normalizeLegacyTimeRangeBoundary(0, 100).rangeConfig,
                    use_time_keeper: false,
                    time_keeper: undefined,
                    default_range: { min: 0, max: 100 },
                },
                axes: createRuntimeAxes(12, 24),
                display: {
                    show_legend: false,
                    use_zoom: false,
                    chart_type: 'Line',
                    show_point: false,
                    point_radius: 3,
                    fill: 0,
                    stroke: 0,
                },
                use_normalize: false,
                highlights: [],
            });
        });
    });

    describe('parseReceivedBoardInfo', () => {
        it('normalizes the board range and panel list together', () => {
            const sRangeConfig = normalizeLegacyTimeRangeBoundary(0, 100).rangeConfig;
            const sLegacyPanelInfo = {
                index_key: 'panel-1',
                chart_title: 'Panel 1',
                tag_set: [],
                range_bgn: 0,
                range_end: 100,
                raw_keeper: false,
                time_keeper: undefined,
                default_range: { min: 0, max: 100 },
                count: 0,
                interval_type: '',
                show_legend: 'N',
                use_zoom: 'N',
                use_time_keeper: 'N',
                show_x_tickline: 'N',
                pixels_per_tick_raw: 12,
                pixels_per_tick: 24,
                use_sampling: false,
                sampling_value: 0,
                zero_base: 'N',
                show_y_tickline: 'N',
                custom_min: 0,
                custom_max: 0,
                custom_drilldown_min: 0,
                custom_drilldown_max: 0,
                use_ucl: 'N',
                ucl_value: 0,
                use_lcl: 'N',
                lcl_value: 0,
                use_right_y2: 'N',
                zero_base2: 'N',
                show_y_tickline2: 'N',
                custom_min2: 0,
                custom_max2: 0,
                custom_drilldown_min2: 0,
                custom_drilldown_max2: 0,
                use_ucl2: 'N',
                ucl2_value: 0,
                use_lcl2: 'N',
                lcl2_value: 0,
                chart_type: 'Line',
                show_point: 'N',
                point_radius: 3,
                fill: 0,
                stroke: 0,
                use_normalize: 'N',
            } as any;

            expect(
                parseReceivedBoardInfo({
                    id: 'board-1',
                    type: 'tag',
                    name: 'Board 1',
                    path: '/board-1',
                    code: '',
                    panels: [sLegacyPanelInfo],
                    range_bgn: 0,
                    range_end: 100,
                    savedCode: false,
                } as any),
            ).toEqual(
                expect.objectContaining({
                    id: 'board-1',
                    panels: [
                        expect.objectContaining({
                            meta: expect.objectContaining({
                                index_key: 'panel-1',
                            }),
                        }),
                    ],
                    range: { min: 0, max: 100 },
                    rangeConfig: sRangeConfig,
                }),
            );
        });

        it('loads direct panel info when the taz version is 2.0.0 or newer', () => {
            const sRangeConfig = normalizeLegacyTimeRangeBoundary(0, 100).rangeConfig;

            const sBoardInfo = parseReceivedBoardInfo({
                id: 'board-2',
                type: 'taz',
                name: 'Board 2',
                path: '/board-2',
                code: '',
                version: '2.0.0',
                panels: [
                    {
                        meta: {
                            index_key: 'panel-modern',
                            chart_title: 'Panel Modern',
                        },
                        data: {
                            tag_set: [
                                {
                                    key: 'tag-1',
                                    table: 'TABLE_A',
                                    sourceTagName: 'tag-1',
                                    alias: '',
                                    calculationMode: 'avg',
                                    color: '#ffffff',
                                    useSecondaryAxis: false,
                                    id: undefined,
                                    useRollupTable: false,
                                    sourceColumns: undefined,
                                },
                            ],
                            raw_keeper: false,
                            count: 0,
                            interval_type: '',
                        },
                        time: {
                            range_bgn: 0,
                            range_end: 100,
                            range_config: sRangeConfig,
                            use_time_keeper: false,
                            time_keeper: undefined,
                            default_range: { min: 0, max: 100 },
                        },
                        axes: {
                            show_x_tickline: false,
                            pixels_per_tick_raw: 1,
                            pixels_per_tick: 1,
                            use_sampling: false,
                            sampling_value: 0,
                            zero_base: false,
                            show_y_tickline: false,
                            primaryRange: { min: 0, max: 0 },
                            primaryDrilldownRange: { min: 0, max: 0 },
                            use_ucl: false,
                            ucl_value: 0,
                            use_lcl: false,
                            lcl_value: 0,
                            use_right_y2: false,
                            zero_base2: false,
                            show_y_tickline2: false,
                            secondaryRange: { min: 0, max: 0 },
                            secondaryDrilldownRange: { min: 0, max: 0 },
                            use_ucl2: false,
                            ucl2_value: 0,
                            use_lcl2: false,
                            lcl2_value: 0,
                        },
                        display: {
                            show_legend: false,
                            use_zoom: false,
                            chart_type: 'Line',
                            show_point: false,
                            point_radius: 0,
                            fill: 0,
                            stroke: 0,
                        },
                        use_normalize: false,
                    },
                ],
                range_bgn: 0,
                range_end: 100,
                savedCode: false,
            } as any);

            expect(sBoardInfo.panels[0].highlights).toEqual([]);
            expect(sBoardInfo.panels[0].data.tag_set[0].annotations).toEqual([]);
        });
    });
});

