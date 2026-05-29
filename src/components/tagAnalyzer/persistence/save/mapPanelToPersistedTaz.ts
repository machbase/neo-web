import type {
    PanelAxisThreshold,
    PanelInfo,
    PanelSampling,
    PanelXAxis,
    PanelYAxis,
    ValueRange,
} from '../../domain/PanelDomain';
import type {
    PanelSeriesDefinition,
    PanelSeriesSourceColumns,
} from '../../domain/SeriesDomain';
import type {
    PanelNavigatorRangePair,
    TimeRangeMs,
} from '../../domain/time/TimeTypes';
import { normalizeStoredTimeUnit } from '../../domain/time/TimeUnitUtils';
import { clonePanelAnnotations, clonePanelHighlights, cloneTimeBoundary } from '../PersistenceCloneUtils';
import type { PersistedPanelInfoV204 } from '../TazPersistenceTypesV204';

export function mapPanelToPersistedTaz(
    panelInfo: PanelInfo,
): PersistedPanelInfoV204 {
    return {
        general: {
            ...panelInfo.general,
            last_viewed_range: clonePanelNavigatorRangePair(
                panelInfo.general.last_viewed_range,
            ),
        },
        data: {
            ...panelInfo.data,
            tag_set: panelInfo.data.tag_set.map(clonePanelSeriesDefinition),
            interval_type:
                normalizeStoredTimeUnit(panelInfo.data.interval_type ?? '') ??
                panelInfo.data.interval_type,
        },
        time: {
            range_config: {
                start: cloneTimeBoundary(panelInfo.time.range_config.start),
                end: cloneTimeBoundary(panelInfo.time.range_config.end),
            },
        },
        axes: {
            x_axis: clonePanelXAxis(panelInfo.axes.x_axis),
            sampling: clonePanelSampling(panelInfo.axes.sampling),
            main_chart_sampling: clonePanelSampling(
                panelInfo.axes.main_chart_sampling,
            ),
            left_y_axis: clonePanelYAxis(panelInfo.axes.left_y_axis),
            right_y_axis: clonePanelYAxis(panelInfo.axes.right_y_axis),
            right_y_axis_enabled: panelInfo.axes.right_y_axis_enabled,
        },
        display: { ...panelInfo.display },
        highlights: clonePanelHighlights(panelInfo.highlights),
        annotations: clonePanelAnnotations(panelInfo.annotations),
    };
}

function clonePanelSeriesDefinition(
    seriesInfo: PanelSeriesDefinition,
): PanelSeriesDefinition {
    return {
        ...seriesInfo,
        sourceColumns: clonePanelSeriesSourceColumns(seriesInfo.sourceColumns),
    };
}

function clonePanelSeriesSourceColumns(
    columns: PanelSeriesSourceColumns,
): PanelSeriesSourceColumns {
    return { ...columns };
}

function clonePanelXAxis(xAxis: PanelXAxis): PanelXAxis {
    return { ...xAxis };
}

function clonePanelSampling(sampling: PanelSampling): PanelSampling {
    return { ...sampling };
}

function clonePanelYAxis(yAxis: PanelYAxis): PanelYAxis {
    return {
        zero_base: yAxis.zero_base,
        show_tickline: yAxis.show_tickline,
        value_range: cloneValueRange(yAxis.value_range),
        raw_data_value_range: cloneValueRange(yAxis.raw_data_value_range),
        upper_control_limit: clonePanelAxisThreshold(
            yAxis.upper_control_limit,
        ),
        lower_control_limit: clonePanelAxisThreshold(
            yAxis.lower_control_limit,
        ),
    };
}

function cloneValueRange(valueRange: ValueRange): ValueRange {
    return { ...valueRange };
}

function clonePanelAxisThreshold(
    threshold: PanelAxisThreshold,
): PanelAxisThreshold {
    return { ...threshold };
}

function clonePanelNavigatorRangePair(
    rangePair: Partial<PanelNavigatorRangePair> | undefined,
): Partial<PanelNavigatorRangePair> | undefined {
    if (!rangePair) {
        return undefined;
    }

    return {
        panelRange: cloneTimeRange(rangePair.panelRange),
        navigatorRange: cloneTimeRange(rangePair.navigatorRange),
    };
}

function cloneTimeRange(timeRange: TimeRangeMs | undefined): TimeRangeMs | undefined {
    return timeRange
        ? {
              startTime: timeRange.startTime,
              endTime: timeRange.endTime,
          }
        : undefined;
}
