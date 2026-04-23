import { createTagAnalyzerPanelInfoFixture } from '../../../TestData/PanelTestData';
import {
    createPanelInfoFromPersistedV200,
    createPanelInfoFromPersistedV204,
} from './TazPanelVersionParser';
import { createPersistedPanelInfo } from '../save/TazPanelSaveMapper';

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
                raw_keeper: sPanelInfo.data.raw_keeper,
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

        const sPersistedPanelInfo = createPersistedPanelInfo(sPanelInfo);
        const sRoundTrippedPanelInfo = createPanelInfoFromPersistedV204(sPersistedPanelInfo);

        expect(sRoundTrippedPanelInfo).toEqual(sPanelInfo);
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
            createPanelInfoFromPersistedV204(sPersistedPanelInfoWithBadChartType).display
                .chart_type,
        ).toBe('Line');
    });
});

