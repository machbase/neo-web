import {
    DEFAULT_RAW_NAVIGATOR_SAMPLING,
    normalizePanelQueryCount,
    type PanelInfo,
} from '../../domain/PanelDomain';
import { normalizeStoredTimeUnit } from '../../domain/time/interval/TimeIntervalUtils';
import { normalizePanelViewRange } from '../../domain/time/boundary/TimeBoundaryValidate';
import {
    clonePanelAnnotations,
    clonePanelHighlights,
} from '../PersistenceCloneUtils';
import type { PersistedPanelInfoV204 } from '../TazPersistenceTypesV204';
import { normalizePersistedPanelRangeInput } from './normalizePersistedPanelRangeConfig';
import { shouldUseNumericPanelRangeInput } from '../../domain/SeriesDomain';

export function isPersistedPanelInfoV204(
    panelInfo: unknown,
): panelInfo is PersistedPanelInfoV204 {
    if (!panelInfo || typeof panelInfo !== 'object') {
        return false;
    }

    const sPanelInfo = panelInfo as Partial<PersistedPanelInfoV204>;
    const sGeneral = sPanelInfo.general;
    const sData = sPanelInfo.data;
    const sTime = sPanelInfo.time;

    return (
        !!sGeneral &&
        typeof sGeneral === 'object' &&
        typeof sGeneral.chart_title === 'string' &&
        typeof sGeneral.use_zoom === 'boolean' &&
        typeof sGeneral.use_last_viewed_range === 'boolean' &&
        typeof sGeneral.is_raw === 'boolean' &&
        (sGeneral.is_order_by === undefined ||
            typeof sGeneral.is_order_by === 'boolean') &&
        typeof sGeneral.use_normalize === 'boolean' &&
        !!sData &&
        typeof sData === 'object' &&
        typeof sData.index_key === 'string' &&
        Array.isArray(sData.tag_set) &&
        !!sTime &&
        typeof sTime === 'object' &&
        !!sTime.range_config &&
        !!sPanelInfo.axes &&
        typeof sPanelInfo.axes === 'object' &&
        !!sPanelInfo.display &&
        typeof sPanelInfo.display === 'object'
    );
}

export function parseLoadedPanelTazVer204(
    panelInfo: PersistedPanelInfoV204,
): PanelInfo {
    const sRangeConfig = normalizePersistedPanelRangeInput(
        panelInfo.time.range_config,
        shouldUseNumericPanelRangeInput(panelInfo.data.tag_set),
    );
    if (!sRangeConfig) {
        throw new Error('Invalid TagAnalyzer .taz panel time range_config structure.');
    }
    const sMainChartSampling =
        panelInfo.axes.main_chart_sampling ?? panelInfo.axes.sampling;

    return {
        key: panelInfo.data.index_key,
        title: panelInfo.general.chart_title,
        query: {
            tagSet: panelInfo.data.tag_set,
            count: normalizePanelQueryCount(panelInfo.data.count),
            intervalType:
                normalizeStoredTimeUnit(panelInfo.data.interval_type ?? '') ??
                panelInfo.data.interval_type,
        },
        mode: {
            isRaw: panelInfo.general.is_raw,
            isOrderBy: panelInfo.general.is_order_by ?? false,
            useNormalize: panelInfo.general.use_normalize,
        },
        timeRange: {
            ...sRangeConfig,
            useLastViewedRange: panelInfo.general.use_last_viewed_range,
            lastViewedRange: normalizePanelViewRange(
                panelInfo.general.last_viewed_range,
            ),
        },
        axes: {
            x: {
                showTickline: panelInfo.axes.x_axis.show_tickline,
            },
            leftY: {
                zeroBase: panelInfo.axes.left_y_axis.zero_base,
                showTickline: panelInfo.axes.left_y_axis.show_tickline,
                valueRange: { ...panelInfo.axes.left_y_axis.value_range },
                rawValueRange: {
                    ...panelInfo.axes.left_y_axis.raw_data_value_range,
                },
                upperControlLimit: {
                    ...panelInfo.axes.left_y_axis.upper_control_limit,
                },
                lowerControlLimit: {
                    ...panelInfo.axes.left_y_axis.lower_control_limit,
                },
            },
            rightY: {
                enabled: panelInfo.axes.right_y_axis_enabled ?? false,
                zeroBase: panelInfo.axes.right_y_axis.zero_base,
                showTickline: panelInfo.axes.right_y_axis.show_tickline,
                valueRange: { ...panelInfo.axes.right_y_axis.value_range },
                rawValueRange: {
                    ...panelInfo.axes.right_y_axis.raw_data_value_range,
                },
                upperControlLimit: {
                    ...panelInfo.axes.right_y_axis.upper_control_limit,
                },
                lowerControlLimit: {
                    ...panelInfo.axes.right_y_axis.lower_control_limit,
                },
            },
        },
        display: {
            chartType: panelInfo.display.chart_type,
            showLegend: panelInfo.display.show_legend,
            showPoint: panelInfo.display.show_point,
            pointRadius: panelInfo.display.point_radius,
            fill: panelInfo.display.fill,
            stroke: panelInfo.display.stroke,
            connectNulls: panelInfo.display.connect_nulls ?? false,
            useZoom: panelInfo.general.use_zoom,
            pixelsPerTick: {
                raw: panelInfo.axes.x_axis.raw_data_pixels_per_tick,
                calculated: panelInfo.axes.x_axis.calculated_data_pixels_per_tick,
                calculatedNavigator:
                    panelInfo.axes.x_axis.calculated_navigator_pixels_per_tick ??
                    panelInfo.axes.x_axis.calculated_data_pixels_per_tick,
            },
            mainChartSampling: {
                enabled: sMainChartSampling?.enabled ?? false,
                sampleCount: sMainChartSampling?.sample_count,
            },
            rawNavigatorSampling: { ...DEFAULT_RAW_NAVIGATOR_SAMPLING },
        },
        highlights: clonePanelHighlights(panelInfo.highlights),
        annotations: clonePanelAnnotations(panelInfo.annotations),
    };
}
