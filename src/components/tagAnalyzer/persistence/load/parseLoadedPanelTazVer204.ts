import {
    DEFAULT_RAW_NAVIGATOR_SAMPLING,
    normalizePanelQueryCount,
    type PanelInfo,
    type PanelYAxis,
} from '../../domain/panel/PanelConfig';
import { isPlainObject } from '../../domain/ObjectGuards';
import { normalizeStoredTimeUnit } from '../../domain/time/TimeIntervalUtils';
import { normalizePanelViewRange } from '../../domain/panelRange/PanelRangeResolver';
import {
    clonePanelAnnotations,
    clonePanelHighlights,
} from '../PersistenceCloneUtils';
import type { PersistedPanelInfoV204 } from '../TazPersistenceTypesV204';
import { normalizePersistedPanelRangeInput } from './normalizePersistedPanelRangeInput';
import { normalizePersistedValueRange } from './normalizePersistedValueRange';
import { shouldUseNumericPanelRangeInput } from '../../domain/SeriesDomain';

export function isPersistedPanelInfoV204(
    panelInfo: unknown,
): panelInfo is PersistedPanelInfoV204 {
    if (!isPlainObject(panelInfo)) {
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
    const sRangeInput = normalizePersistedPanelRangeInput(
        panelInfo.time.range_config,
        shouldUseNumericPanelRangeInput(panelInfo.data.tag_set),
    );
    if (!sRangeInput) {
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
        time: {
            rangeInput: sRangeInput,
            useLastViewedRange: panelInfo.general.use_last_viewed_range,
            lastViewedRange: normalizePanelViewRange(
                panelInfo.general.last_viewed_range,
            ),
        },
        axes: {
            x: {
                showTickline: panelInfo.axes.x_axis.show_tickline,
            },
            leftY: mapPersistedYAxis(panelInfo.axes.left_y_axis),
            rightY: {
                ...mapPersistedYAxis(panelInfo.axes.right_y_axis),
                enabled: panelInfo.axes.right_y_axis_enabled ?? false,
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

function normalizeLoadedValueRange(
    valueRange: unknown,
    label: string,
): PanelYAxis['valueRange'] {
    const sValueRange = normalizePersistedValueRange(valueRange);
    if (!sValueRange) {
        throw new Error(`Invalid TagAnalyzer .taz panel axis ${label} structure.`);
    }

    return sValueRange;
}
function mapPersistedYAxis(
    axis: PersistedPanelInfoV204['axes']['left_y_axis'],
): PanelYAxis {
    return {
        zeroBase: axis.zero_base,
        showTickline: axis.show_tickline,
        valueRange: normalizeLoadedValueRange(axis.value_range, 'value_range'),
        rawValueRange: normalizeLoadedValueRange(
            axis.raw_data_value_range,
            'raw_data_value_range',
        ),
        upperControlLimit: { ...axis.upper_control_limit },
        lowerControlLimit: { ...axis.lower_control_limit },
    };
}
