import { concatTagSet } from '@/utils/helpers/tags';
import type { BoardInfo } from '../boardTypes';
import type { PanelInfo } from '../panelModelTypes';
import type { TimeRangePair } from '../time/timeTypes';
import {
    fromLegacyBoolean,
    normalizeLegacySeriesConfigs,
} from '../legacy/LegacySeriesAdapter';
import {
    normalizeLegacyTimeRangeBoundary,
} from '../legacy/LegacyTimeAdapter';
import type {
    LegacyBoardSourceInfo,
    LegacyFlatPanelInfo,
} from '../legacy/LegacyTypes';
import {
    createPanelInfoFromPersistedV200,
    createPanelInfoFromPersistedV201,
    isPersistedPanelInfoV200,
    isPersistedPanelInfoV201,
    type PersistedPanelInfoV200,
    type PersistedPanelInfoV201,
    type PersistedSeriesInfoV200,
    type PersistedSeriesInfoV201,
} from './SavePanelInfo';
import { resolvePersistedTazVersion, type PersistedTazVersion } from './TazVersion';

/**
 * Parses received board data into the runtime board model.
 * Intent: Normalize every supported `.taz` input version at the boundary before the UI uses it.
 * @param {LegacyBoardSourceInfo} aBoardInfo The received board data from Recoil or a `.taz` file.
 * @returns {BoardInfo} The runtime board model used internally by TagAnalyzer.
 */
export function parseReceivedBoardInfo(aBoardInfo: LegacyBoardSourceInfo): BoardInfo {
    const sBoardTime = normalizeLegacyTimeRangeBoundary(
        aBoardInfo.range_bgn,
        aBoardInfo.range_end,
    );
    const sPersistedVersion = resolvePersistedTazVersion(aBoardInfo.version);

    return {
        ...aBoardInfo,
        panels: (aBoardInfo.panels ?? []).map((aPanelInfo) =>
            parseReceivedPanelInfo(aPanelInfo, sPersistedVersion),
        ),
        range: sBoardTime.range,
        rangeConfig: sBoardTime.rangeConfig,
    };
}

/**
 * Parses one received panel into the runtime panel model.
 * Intent: Keep `.taz` version branching isolated at the persistence boundary.
 * @param {unknown} aPanelInfo The received panel value.
 * @param {PersistedTazVersion} aPersistedVersion The resolved `.taz` format version.
 * @returns {PanelInfo} The runtime panel model.
 */
export function parseReceivedPanelInfo(
    aPanelInfo: unknown,
    aPersistedVersion: PersistedTazVersion,
): PanelInfo {
    if (aPersistedVersion === '2.0.1' && isPersistedPanelInfoV201(aPanelInfo)) {
        return createPanelInfoFromPersistedV201(
            normalizePersistedPanelInfoV201(aPanelInfo),
        );
    }

    if (aPersistedVersion === '2.0.0' && isPersistedPanelInfoV200(aPanelInfo)) {
        return createPanelInfoFromPersistedV200(
            normalizePersistedPanelInfoV200(aPanelInfo),
        );
    }

    if (isPersistedPanelInfoV201(aPanelInfo)) {
        return createPanelInfoFromPersistedV201(
            normalizePersistedPanelInfoV201(aPanelInfo),
        );
    }

    if (isPersistedPanelInfoV200(aPanelInfo)) {
        return createPanelInfoFromPersistedV200(
            normalizePersistedPanelInfoV200(aPanelInfo),
        );
    }

    return createPanelInfoFromLegacyFlatPanelInfo(aPanelInfo as LegacyFlatPanelInfo);
}

function normalizePersistedPanelInfoV200(
    aPanelInfo: PersistedPanelInfoV200,
): PersistedPanelInfoV200 {
    return {
        ...aPanelInfo,
        data: {
            ...aPanelInfo.data,
            tag_set: createColoredSeriesListV200(aPanelInfo.data.tag_set ?? []).map(
                normalizePersistedSeriesInfoV200,
            ),
            raw_keeper: aPanelInfo.data.raw_keeper ?? false,
            count: aPanelInfo.data.count ?? -1,
        },
        time: {
            ...aPanelInfo.time,
            range_bgn: aPanelInfo.time.range_bgn ?? 0,
            range_end: aPanelInfo.time.range_end ?? 0,
            time_keeper: normalizeLegacyTimeKeeper(aPanelInfo.time.time_keeper),
        },
        highlights: aPanelInfo.highlights ?? [],
    };
}

function normalizePersistedPanelInfoV201(
    aPanelInfo: PersistedPanelInfoV201,
): PersistedPanelInfoV201 {
    return {
        ...aPanelInfo,
        data: {
            ...aPanelInfo.data,
            seriesList: createColoredSeriesListV201(aPanelInfo.data.seriesList ?? []).map(
                normalizePersistedSeriesInfoV201,
            ),
            useRawData: aPanelInfo.data.useRawData ?? false,
            rowLimit: aPanelInfo.data.rowLimit ?? -1,
        },
        time: {
            ...aPanelInfo.time,
            rangeStart: aPanelInfo.time.rangeStart ?? 0,
            rangeEnd: aPanelInfo.time.rangeEnd ?? 0,
            savedTimeRange: normalizeLegacyTimeKeeper(aPanelInfo.time.savedTimeRange),
        },
        highlights: aPanelInfo.highlights ?? [],
    };
}

function normalizePersistedSeriesInfoV200(
    aSeriesInfo: PersistedSeriesInfoV200,
): PersistedSeriesInfoV200 {
    return {
        ...aSeriesInfo,
        annotations: aSeriesInfo.annotations ?? [],
    };
}

function normalizePersistedSeriesInfoV201(
    aSeriesInfo: PersistedSeriesInfoV201,
): PersistedSeriesInfoV201 {
    return {
        ...aSeriesInfo,
        annotations: aSeriesInfo.annotations ?? [],
    };
}

function createColoredSeriesListV200(
    aSeriesList: PersistedSeriesInfoV200[],
): PersistedSeriesInfoV200[] {
    if (aSeriesList[0]?.color) {
        return aSeriesList.map((aSeriesInfo) => ({ ...aSeriesInfo }));
    }

    return concatTagSet([], aSeriesList) as PersistedSeriesInfoV200[];
}

function createColoredSeriesListV201(
    aSeriesList: PersistedSeriesInfoV201[],
): PersistedSeriesInfoV201[] {
    if (aSeriesList[0]?.color) {
        return aSeriesList.map((aSeriesInfo) => ({ ...aSeriesInfo }));
    }

    return concatTagSet([], aSeriesList) as PersistedSeriesInfoV201[];
}

function createPanelInfoFromLegacyFlatPanelInfo(
    aPanelInfo: LegacyFlatPanelInfo,
): PanelInfo {
    return createNormalizedLegacyPanelInfo(normalizeLegacyFlatPanelInfo(aPanelInfo));
}

function normalizeLegacyFlatPanelInfo(aPanelInfo: LegacyFlatPanelInfo) {
    const sTimeRange = normalizeLegacyTimeRangeBoundary(aPanelInfo.range_bgn, aPanelInfo.range_end);

    return {
        index_key: aPanelInfo.index_key,
        chart_title: aPanelInfo.chart_title,
        tag_set: normalizeLegacySeriesConfigs(aPanelInfo.tag_set || []),
        range_bgn: sTimeRange.range.min,
        range_end: sTimeRange.range.max,
        range_config: sTimeRange.rangeConfig,
        raw_keeper: aPanelInfo.raw_keeper ?? false,
        time_keeper: normalizeLegacyTimeKeeper(aPanelInfo.time_keeper),
        default_range: aPanelInfo.default_range,
        count: aPanelInfo.count ?? -1,
        interval_type: aPanelInfo.interval_type,
        show_legend: fromLegacyBoolean(aPanelInfo.show_legend),
        use_zoom: fromLegacyBoolean(aPanelInfo.use_zoom),
        use_normalize: fromLegacyBoolean(aPanelInfo.use_normalize),
        use_time_keeper: fromLegacyBoolean(aPanelInfo.use_time_keeper),
        show_x_tickline: fromLegacyBoolean(aPanelInfo.show_x_tickline),
        pixels_per_tick_raw: normalizeNumericValue(aPanelInfo.pixels_per_tick_raw),
        pixels_per_tick: normalizeNumericValue(aPanelInfo.pixels_per_tick),
        use_sampling: aPanelInfo.use_sampling,
        sampling_value: normalizeNumericValue(aPanelInfo.sampling_value),
        zero_base: fromLegacyBoolean(aPanelInfo.zero_base),
        show_y_tickline: fromLegacyBoolean(aPanelInfo.show_y_tickline),
        custom_min: normalizeNumericValue(aPanelInfo.custom_min),
        custom_max: normalizeNumericValue(aPanelInfo.custom_max),
        custom_drilldown_min: normalizeNumericValue(aPanelInfo.custom_drilldown_min),
        custom_drilldown_max: normalizeNumericValue(aPanelInfo.custom_drilldown_max),
        use_ucl: fromLegacyBoolean(aPanelInfo.use_ucl),
        ucl_value: normalizeNumericValue(aPanelInfo.ucl_value),
        use_lcl: fromLegacyBoolean(aPanelInfo.use_lcl),
        lcl_value: normalizeNumericValue(aPanelInfo.lcl_value),
        use_right_y2: fromLegacyBoolean(aPanelInfo.use_right_y2),
        zero_base2: fromLegacyBoolean(aPanelInfo.zero_base2),
        show_y_tickline2: fromLegacyBoolean(aPanelInfo.show_y_tickline2),
        custom_min2: normalizeNumericValue(aPanelInfo.custom_min2),
        custom_max2: normalizeNumericValue(aPanelInfo.custom_max2),
        custom_drilldown_min2: normalizeNumericValue(aPanelInfo.custom_drilldown_min2),
        custom_drilldown_max2: normalizeNumericValue(aPanelInfo.custom_drilldown_max2),
        use_ucl2: fromLegacyBoolean(aPanelInfo.use_ucl2),
        ucl2_value: normalizeNumericValue(aPanelInfo.ucl2_value),
        use_lcl2: fromLegacyBoolean(aPanelInfo.use_lcl2),
        lcl2_value: normalizeNumericValue(aPanelInfo.lcl2_value),
        chart_type: aPanelInfo.chart_type,
        show_point: fromLegacyBoolean(aPanelInfo.show_point),
        point_radius: normalizeNumericValue(aPanelInfo.point_radius),
        fill: normalizeNumericValue(aPanelInfo.fill),
        stroke: normalizeNumericValue(aPanelInfo.stroke),
    };
}

function createNormalizedLegacyPanelInfo(
    aPanelInfo: ReturnType<typeof normalizeLegacyFlatPanelInfo>,
): PanelInfo {
    return {
        meta: {
            index_key: aPanelInfo.index_key,
            chart_title: aPanelInfo.chart_title,
        },
        data: {
            tag_set: aPanelInfo.tag_set,
            raw_keeper: aPanelInfo.raw_keeper,
            count: aPanelInfo.count,
            interval_type: aPanelInfo.interval_type,
        },
        time: {
            range_bgn: aPanelInfo.range_bgn,
            range_end: aPanelInfo.range_end,
            range_config: aPanelInfo.range_config,
            use_time_keeper: aPanelInfo.use_time_keeper,
            time_keeper: aPanelInfo.time_keeper,
            default_range: aPanelInfo.default_range,
        },
        axes: {
            show_x_tickline: aPanelInfo.show_x_tickline,
            pixels_per_tick_raw: aPanelInfo.pixels_per_tick_raw,
            pixels_per_tick: aPanelInfo.pixels_per_tick,
            use_sampling: aPanelInfo.use_sampling,
            sampling_value: aPanelInfo.sampling_value,
            zero_base: aPanelInfo.zero_base,
            show_y_tickline: aPanelInfo.show_y_tickline,
            primaryRange: {
                min: aPanelInfo.custom_min,
                max: aPanelInfo.custom_max,
            },
            primaryDrilldownRange: {
                min: aPanelInfo.custom_drilldown_min,
                max: aPanelInfo.custom_drilldown_max,
            },
            use_ucl: aPanelInfo.use_ucl,
            ucl_value: aPanelInfo.ucl_value,
            use_lcl: aPanelInfo.use_lcl,
            lcl_value: aPanelInfo.lcl_value,
            use_right_y2: aPanelInfo.use_right_y2,
            zero_base2: aPanelInfo.zero_base2,
            show_y_tickline2: aPanelInfo.show_y_tickline2,
            secondaryRange: {
                min: aPanelInfo.custom_min2,
                max: aPanelInfo.custom_max2,
            },
            secondaryDrilldownRange: {
                min: aPanelInfo.custom_drilldown_min2,
                max: aPanelInfo.custom_drilldown_max2,
            },
            use_ucl2: aPanelInfo.use_ucl2,
            ucl2_value: aPanelInfo.ucl2_value,
            use_lcl2: aPanelInfo.use_lcl2,
            lcl2_value: aPanelInfo.lcl2_value,
        },
        display: {
            show_legend: aPanelInfo.show_legend,
            use_zoom: aPanelInfo.use_zoom,
            chart_type: aPanelInfo.chart_type,
            show_point: aPanelInfo.show_point,
            point_radius: aPanelInfo.point_radius,
            fill: aPanelInfo.fill,
            stroke: aPanelInfo.stroke,
        },
        use_normalize: aPanelInfo.use_normalize,
        highlights: [],
    };
}

function normalizeNumericValue(aValue: number | string | undefined): number {
    if (aValue === undefined || aValue === '') {
        return 0;
    }

    return typeof aValue === 'number' ? aValue : Number(aValue);
}

function normalizeLegacyTimeKeeper(
    aTimeKeeper: Partial<TimeRangePair> | '' | undefined,
): Partial<TimeRangePair> | undefined {
    return aTimeKeeper === '' ? undefined : aTimeKeeper;
}
