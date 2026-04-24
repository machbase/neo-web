import { createTagAnalyzerPanelInfoFixture } from '../../../TestData/PanelTestData';
import {
    createPanelInfoFromPersistedV200,
    createPanelInfoFromPersistedV204,
    createPanelInfoFromPersistedV205,
    createPanelInfoFromPersistedV207,
} from './TazPanelVersionParser';
import { createPersistedPanelInfo } from '../save/TazPanelSaveMapper';
import type { PersistedPanelInfoV204 } from '../TazPanelPersistenceTypes';

describe('TazPanelVersionParser', () => {
    it('loads a persisted 2.0.0 panel into the runtime panel shape', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);
        const sPersistedSeriesInfo = sPanelInfo.data.tag_set.map((aSeriesInfo) => ({
            key: aSeriesInfo.key,
            table: aSeriesInfo.table,
            sourceTagName: aSeriesInfo.sourceTagName,
            alias: aSeriesInfo.alias,
            calculationMode: aSeriesInfo.calculationMode,
            color: aSeriesInfo.color,
            use_y2: aSeriesInfo.useSecondaryAxis,
            id: aSeriesInfo.id,
            onRollup: aSeriesInfo.useRollupTable,
            colName: aSeriesInfo.sourceColumns,
            annotations: aSeriesInfo.annotations,
        }));

        const sLoadedPanelInfo = createPanelInfoFromPersistedV200({
            meta: {
                index_key: sPanelInfo.meta.index_key,
                chart_title: sPanelInfo.meta.chart_title,
            },
            data: {
                tag_set: sPersistedSeriesInfo,
                raw_keeper: sPanelInfo.toolbar.isRaw,
                count: sPanelInfo.data.count,
                interval_type: sPanelInfo.data.interval_type,
            },
            time: sPanelInfo.time,
            axes: {
                show_x_tickline: sPanelInfo.axes.x_axis.show_tickline,
                pixels_per_tick_raw: sPanelInfo.axes.x_axis.raw_data_pixels_per_tick,
                pixels_per_tick: sPanelInfo.axes.x_axis.calculated_data_pixels_per_tick,
                use_sampling: sPanelInfo.axes.sampling.enabled,
                sampling_value: sPanelInfo.axes.sampling.sample_count,
                zero_base: sPanelInfo.axes.left_y_axis.zero_base,
                show_y_tickline: sPanelInfo.axes.left_y_axis.show_tickline,
                primaryRange: sPanelInfo.axes.left_y_axis.value_range,
                primaryDrilldownRange: sPanelInfo.axes.left_y_axis.raw_data_value_range,
                use_ucl: sPanelInfo.axes.left_y_axis.upper_control_limit.enabled,
                ucl_value: sPanelInfo.axes.left_y_axis.upper_control_limit.value,
                use_lcl: sPanelInfo.axes.left_y_axis.lower_control_limit.enabled,
                lcl_value: sPanelInfo.axes.left_y_axis.lower_control_limit.value,
                use_right_y2: sPanelInfo.axes.right_y_axis.enabled,
                zero_base2: sPanelInfo.axes.right_y_axis.zero_base,
                show_y_tickline2: sPanelInfo.axes.right_y_axis.show_tickline,
                secondaryRange: sPanelInfo.axes.right_y_axis.value_range,
                secondaryDrilldownRange:
                    sPanelInfo.axes.right_y_axis.raw_data_value_range,
                use_ucl2: sPanelInfo.axes.right_y_axis.upper_control_limit.enabled,
                ucl2_value: sPanelInfo.axes.right_y_axis.upper_control_limit.value,
                use_lcl2: sPanelInfo.axes.right_y_axis.lower_control_limit.enabled,
                lcl2_value: sPanelInfo.axes.right_y_axis.lower_control_limit.value,
            },
            display: sPanelInfo.display,
            use_normalize: sPanelInfo.use_normalize,
            highlights: sPanelInfo.highlights,
        });

        expect(sLoadedPanelInfo).toEqual(sPanelInfo);
    });

    it('round-trips one runtime panel through the persisted 2.0.4 shape', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);

        const sPersistedPanelInfo: PersistedPanelInfoV204 = {
            ...createPersistedPanelInfo(sPanelInfo),
            time: {
                rangeStart: sPanelInfo.time.range_bgn,
                rangeEnd: sPanelInfo.time.range_end,
                rangeConfig: sPanelInfo.time.range_config,
                useSavedTimeRange: sPanelInfo.time.use_time_keeper,
                savedTimeRange: sPanelInfo.time.time_keeper,
                defaultValueRange: sPanelInfo.time.default_range,
            },
        };
        const sRoundTrippedPanelInfo = createPanelInfoFromPersistedV204(sPersistedPanelInfo);

        expect(sRoundTrippedPanelInfo).toEqual(sPanelInfo);
    });

    it('loads a persisted 2.0.5 panel without restored viewport state', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture({
            time: {
                range_bgn: 1_000,
                range_end: 2_000,
                range_config: {
                    start: { kind: 'absolute', timestamp: 1_000 },
                    end: { kind: 'absolute', timestamp: 2_000 },
                },
            },
        });

        const sPersistedPanelInfo = createPersistedPanelInfo(sPanelInfo);
        const sLoadedPanelInfo = createPanelInfoFromPersistedV205(sPersistedPanelInfo);

        expect(sLoadedPanelInfo).toEqual({
            ...sPanelInfo,
            time: {
                ...sPanelInfo.time,
                use_time_keeper: false,
                time_keeper: undefined,
                default_range: undefined,
            },
        });
    });

    it('normalizes unsupported persisted chart types before creating runtime display state', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);
        const sPersistedPanelInfo = createPersistedPanelInfo(sPanelInfo);
        const sPersistedPanelInfoWithBadChartType = {
            ...sPersistedPanelInfo,
            display: {
                ...sPersistedPanelInfo.display,
                chartType: 'Unsupported',
            },
        } as unknown as ReturnType<typeof createPersistedPanelInfo>;

        expect(
            createPanelInfoFromPersistedV205(sPersistedPanelInfoWithBadChartType).display
                .chart_type,
        ).toBe('Line');
    });

    it('loads a persisted 2.0.7 panel with toolbar raw mode split out of data', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture({
            toolbar: {
                isRaw: true,
            },
        });
        const sPersistedPanelInfo = createPersistedPanelInfo(sPanelInfo);

        expect(createPanelInfoFromPersistedV207(sPersistedPanelInfo)).toEqual({
            ...sPanelInfo,
            time: {
                ...sPanelInfo.time,
                range_bgn: 0,
                range_end: 0,
                use_time_keeper: false,
                time_keeper: undefined,
                default_range: undefined,
            },
        });
    });
});

