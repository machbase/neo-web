import type { PanelInfo } from '../../../../domain/PanelModel';
import { normalizePanelEChartType } from '../../../../domain/PanelModel';
import type { LegacyFlatPanelInfo } from './LegacyFlatPanelTypes';
import { createPanelInfoFromLegacyFlatPanelInfo } from './LegacyFlatPanelMapper';

type LegacyNestedPanelTaz = {
    meta: {
        index_key: string;
        chart_title: string;
    };
    data: {
        tag_set: unknown[];
        raw_keeper?: boolean;
        count?: number;
        interval_type?: string;
    };
    time: {
        range_bgn: unknown;
        range_end: unknown;
        use_time_keeper?: boolean;
        time_keeper?: unknown;
        default_range?: unknown;
    };
    axes: Record<string, unknown>;
    display: Record<string, unknown>;
    use_normalize?: boolean;
};

export function parseLoadedLegacyPanelTaz(panelInfo: unknown): PanelInfo {
    if (isLegacyNestedPanelTaz(panelInfo)) {
        return createPanelInfoFromLegacyFlatPanelInfo(
            flattenLegacyNestedPanelTaz(panelInfo),
        );
    }

    if (isLegacyFlatPanelTaz(panelInfo)) {
        return createPanelInfoFromLegacyFlatPanelInfo(panelInfo);
    }

    throw new Error('Unsupported TagAnalyzer legacy .taz panel shape.');
}

export function isLegacyNestedPanelTaz(panelInfo: unknown): panelInfo is LegacyNestedPanelTaz {
    if (!panelInfo || typeof panelInfo !== 'object') {
        return false;
    }

    const sPanelInfo = panelInfo as Record<string, unknown>;
    const sMeta = sPanelInfo.meta as Record<string, unknown> | undefined;

    return (
        !!sMeta &&
        typeof sMeta.index_key === 'string' &&
        typeof sMeta.chart_title === 'string' &&
        !!sPanelInfo.data &&
        typeof sPanelInfo.data === 'object' &&
        !!sPanelInfo.time &&
        typeof sPanelInfo.time === 'object' &&
        !!sPanelInfo.axes &&
        typeof sPanelInfo.axes === 'object' &&
        !!sPanelInfo.display &&
        typeof sPanelInfo.display === 'object'
    );
}

export function isLegacyFlatPanelTaz(panelInfo: unknown): panelInfo is LegacyFlatPanelInfo {
    if (!panelInfo || typeof panelInfo !== 'object') {
        return false;
    }

    const sPanelInfo = panelInfo as Record<string, unknown>;

    return (
        typeof sPanelInfo.index_key === 'string' &&
        typeof sPanelInfo.chart_title === 'string'
    );
}

function flattenLegacyNestedPanelTaz(panelInfo: LegacyNestedPanelTaz): LegacyFlatPanelInfo {
    const sAxes = panelInfo.axes as Record<string, unknown>;
    const sDisplay = panelInfo.display as Record<string, unknown>;
    const sPrimaryRange = (sAxes.primaryRange as Record<string, unknown> | undefined) ?? {};
    const sPrimaryDrilldownRange =
        (sAxes.primaryDrilldownRange as Record<string, unknown> | undefined) ?? {};
    const sSecondaryRange = (sAxes.secondaryRange as Record<string, unknown> | undefined) ?? {};
    const sSecondaryDrilldownRange =
        (sAxes.secondaryDrilldownRange as Record<string, unknown> | undefined) ?? {};

    return {
        index_key: panelInfo.meta.index_key,
        chart_title: panelInfo.meta.chart_title,
        tag_set: Array.isArray(panelInfo.data.tag_set) ? (panelInfo.data.tag_set as LegacyFlatPanelInfo['tag_set']) : [],
        range_bgn: panelInfo.time.range_bgn as LegacyFlatPanelInfo['range_bgn'],
        range_end: panelInfo.time.range_end as LegacyFlatPanelInfo['range_end'],
        raw_keeper: panelInfo.data.raw_keeper ?? false,
        time_keeper: panelInfo.time.time_keeper as LegacyFlatPanelInfo['time_keeper'],
        default_range: panelInfo.time.default_range as LegacyFlatPanelInfo['default_range'],
        count: panelInfo.data.count,
        interval_type: panelInfo.data.interval_type,
        interval_value: 1,
        show_legend: toLegacyFlag(sDisplay.show_legend),
        use_zoom: toLegacyFlag(sDisplay.use_zoom),
        use_normalize: toLegacyFlag(panelInfo.use_normalize),
        use_time_keeper: toLegacyFlag(panelInfo.time.use_time_keeper),
        show_x_tickline: toLegacyFlag(sAxes.show_x_tickline),
        pixels_per_tick_raw: toLegacyNumber(sAxes.pixels_per_tick_raw),
        pixels_per_tick: toLegacyNumber(sAxes.pixels_per_tick),
        use_sampling: toLegacySamplingEnabled(sAxes.use_sampling),
        sampling_value: toLegacyNumber(sAxes.sampling_value),
        zero_base: toLegacyFlag(sAxes.zero_base),
        show_y_tickline: toLegacyFlag(sAxes.show_y_tickline),
        custom_min: toLegacyNumber(sPrimaryRange.min),
        custom_max: toLegacyNumber(sPrimaryRange.max),
        custom_drilldown_min: toLegacyNumber(sPrimaryDrilldownRange.min),
        custom_drilldown_max: toLegacyNumber(sPrimaryDrilldownRange.max),
        use_ucl: toLegacyFlag(sAxes.use_ucl),
        ucl_value: toLegacyNumber(sAxes.ucl_value),
        use_lcl: toLegacyFlag(sAxes.use_lcl),
        lcl_value: toLegacyNumber(sAxes.lcl_value),
        use_right_y2: toLegacyFlag(sAxes.use_right_y2),
        zero_base2: toLegacyFlag(sAxes.zero_base2),
        show_y_tickline2: toLegacyFlag(sAxes.show_y_tickline2),
        custom_min2: toLegacyNumber(sSecondaryRange.min),
        custom_max2: toLegacyNumber(sSecondaryRange.max),
        custom_drilldown_min2: toLegacyNumber(sSecondaryDrilldownRange.min),
        custom_drilldown_max2: toLegacyNumber(sSecondaryDrilldownRange.max),
        use_ucl2: toLegacyFlag(sAxes.use_ucl2),
        ucl2_value: toLegacyNumber(sAxes.ucl2_value),
        use_lcl2: toLegacyFlag(sAxes.use_lcl2),
        lcl2_value: toLegacyNumber(sAxes.lcl2_value),
        chart_type: normalizePanelEChartType(sDisplay.chart_type),
        show_point: toLegacyFlag(sDisplay.show_point),
        point_radius: toLegacyNumber(sDisplay.point_radius),
        fill: toLegacyNumber(sDisplay.fill),
        stroke: toLegacyNumber(sDisplay.stroke),
    };
}

function toLegacyFlag(value: unknown): 'Y' | 'N' {
    return value === true || value === 'Y' ? 'Y' : 'N';
}

function toLegacySamplingEnabled(value: unknown): boolean {
    if (value === undefined || value === null || value === '') {
        return true;
    }

    return value === true || value === 'Y';
}

function toLegacyNumber(value: unknown): number | string {
    if (value === undefined || value === null || value === '') {
        return 0;
    }

    return typeof value === 'number' || typeof value === 'string' ? value : 0;
}
