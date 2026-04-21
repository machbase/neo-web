import type { GBoardListType } from '@/recoil/recoil';
import type { BoardInfo } from '../boardTypes';
import type { PanelInfo } from '../panelModelTypes';
import type { TimeRangeConfig, TimeRangePair } from '../time/timeTypes';
import {
    fromLegacyBoolean,
    normalizeLegacySeriesConfigs,
    toLegacyBoolean,
    toLegacySeriesConfigs,
} from './LegacySeriesAdapter';
import {
    normalizeLegacyTimeRangeBoundary,
    toLegacyTimeValue,
} from './LegacyTimeAdapter';
import type { LegacyBoardSourceInfo, LegacyFlatPanelInfo } from './LegacyTypes';

/**
 * Converts legacy board data into the nested board model.
 * Intent: Keep legacy board hydration in one place so the rest of the app only sees modern state.
 * @param {LegacyBoardSourceInfo} aBoardInfo - The legacy board data to convert.
 * @returns {BoardInfo} The normalized board model.
 */
export function normalizeBoardInfo(aBoardInfo: LegacyBoardSourceInfo): BoardInfo {
    const sBoardTime = normalizeLegacyTimeRangeBoundary(
        aBoardInfo.range_bgn,
        aBoardInfo.range_end,
    );

    return {
        ...aBoardInfo,
        panels: aBoardInfo.panels.map((aPanel) => normalizeLegacyPanelInfo(aPanel)),
        range: sBoardTime.range,
        rangeConfig: sBoardTime.rangeConfig,
    };
}

/**
 * Flattens nested panel data into the legacy storage shape.
 * Intent: Serialize panel state back into the board record format used by older storage.
 * @param {PanelInfo} aPanelInfo - The nested panel model to convert.
 * @returns {LegacyFlatPanelInfo} The legacy flat panel record.
 */
export function toLegacyFlatPanelInfo(aPanelInfo: PanelInfo): LegacyFlatPanelInfo {
    const sRangeConfig = resolvePanelTimeRangeConfig(aPanelInfo);

    return {
        index_key: aPanelInfo.meta.index_key,
        chart_title: aPanelInfo.meta.chart_title,
        tag_set: toLegacySeriesConfigs(aPanelInfo.data.tag_set),
        range_bgn: toLegacyTimeValue(sRangeConfig.start),
        range_end: toLegacyTimeValue(sRangeConfig.end),
        raw_keeper: aPanelInfo.data.raw_keeper,
        time_keeper: aPanelInfo.time.time_keeper,
        default_range: aPanelInfo.time.default_range,
        count: aPanelInfo.data.count,
        interval_type: aPanelInfo.data.interval_type,
        show_legend: toLegacyBoolean(aPanelInfo.display.show_legend),
        use_zoom: toLegacyBoolean(aPanelInfo.display.use_zoom),
        use_normalize: toLegacyBoolean(aPanelInfo.use_normalize),
        use_time_keeper: toLegacyBoolean(aPanelInfo.time.use_time_keeper),
        show_x_tickline: toLegacyBoolean(aPanelInfo.axes.show_x_tickline),
        pixels_per_tick_raw: aPanelInfo.axes.pixels_per_tick_raw,
        pixels_per_tick: aPanelInfo.axes.pixels_per_tick,
        use_sampling: aPanelInfo.axes.use_sampling,
        sampling_value: aPanelInfo.axes.sampling_value,
        zero_base: toLegacyBoolean(aPanelInfo.axes.zero_base),
        show_y_tickline: toLegacyBoolean(aPanelInfo.axes.show_y_tickline),
        custom_min: aPanelInfo.axes.primaryRange.min,
        custom_max: aPanelInfo.axes.primaryRange.max,
        custom_drilldown_min: aPanelInfo.axes.primaryDrilldownRange.min,
        custom_drilldown_max: aPanelInfo.axes.primaryDrilldownRange.max,
        use_ucl: toLegacyBoolean(aPanelInfo.axes.use_ucl),
        ucl_value: aPanelInfo.axes.ucl_value,
        use_lcl: toLegacyBoolean(aPanelInfo.axes.use_lcl),
        lcl_value: aPanelInfo.axes.lcl_value,
        use_right_y2: toLegacyBoolean(aPanelInfo.axes.use_right_y2),
        zero_base2: toLegacyBoolean(aPanelInfo.axes.zero_base2),
        show_y_tickline2: toLegacyBoolean(aPanelInfo.axes.show_y_tickline2),
        custom_min2: aPanelInfo.axes.secondaryRange.min,
        custom_max2: aPanelInfo.axes.secondaryRange.max,
        custom_drilldown_min2: aPanelInfo.axes.secondaryDrilldownRange.min,
        custom_drilldown_max2: aPanelInfo.axes.secondaryDrilldownRange.max,
        use_ucl2: toLegacyBoolean(aPanelInfo.axes.use_ucl2),
        ucl2_value: aPanelInfo.axes.ucl2_value,
        use_lcl2: toLegacyBoolean(aPanelInfo.axes.use_lcl2),
        lcl2_value: aPanelInfo.axes.lcl2_value,
        chart_type: aPanelInfo.display.chart_type,
        show_point: toLegacyBoolean(aPanelInfo.display.show_point),
        point_radius: aPanelInfo.display.point_radius,
        fill: aPanelInfo.display.fill,
        stroke: aPanelInfo.display.stroke,
    };
}

/**
 * Replaces one board's panels with a fresh legacy panel list.
 * Intent: Persist the current panel set when saving a whole board.
 * @param {GBoardListType[]} aBoards - The current board list.
 * @param {string} aBoardId - The board id to update.
 * @param {PanelInfo[]} aPanels - The panels to save into the board.
 * @returns {GBoardListType[]} The updated board list.
 */
export function getNextBoardListWithSavedPanels(
    aBoards: GBoardListType[],
    aBoardId: string,
    aPanels: PanelInfo[],
): GBoardListType[] {
    return updateBoardPanels(aBoards, aBoardId, createLegacyPanelList(aPanels));
}

/**
 * Replaces one saved panel inside a board panel list.
 * Intent: Update a single panel in legacy storage without touching the rest of the board.
 * @param {GBoardListType[]} aBoards - The current board list.
 * @param {string} aBoardId - The board id to update.
 * @param {string} aPanelKey - The panel key to replace.
 * @param {PanelInfo} aPanelInfo - The updated panel data.
 * @returns {GBoardListType[]} The updated board list.
 */
export function getNextBoardListWithSavedPanel(
    aBoards: GBoardListType[],
    aBoardId: string,
    aPanelKey: string,
    aPanelInfo: PanelInfo,
): GBoardListType[] {
    const sPanels = findBoardPanels(aBoards, aBoardId);
    if (!sPanels) {
        return aBoards;
    }

    return updateBoardPanels(aBoards, aBoardId, replaceLegacyPanel(sPanels, aPanelKey, aPanelInfo));
}

/**
 * Removes one saved panel from a board panel list.
 * Intent: Drop deleted panels from the legacy board record.
 * @param {GBoardListType[]} aBoards - The current board list.
 * @param {string} aBoardId - The board id to update.
 * @param {string} aPanelKey - The panel key to remove.
 * @returns {GBoardListType[]} The updated board list.
 */
export function getNextBoardListWithoutPanel(
    aBoards: GBoardListType[],
    aBoardId: string,
    aPanelKey: string,
): GBoardListType[] {
    const sPanels = findBoardPanels(aBoards, aBoardId);
    if (!sPanels) {
        return aBoards;
    }

    return updateBoardPanels(aBoards, aBoardId, removeLegacyPanel(sPanels, aPanelKey));
}

/**
 * Converts legacy flat panel data into the nested panel model.
 * Intent: Read persisted panel records into the modern panel shape.
 * @param {LegacyFlatPanelInfo} aPanelInfo - The legacy flat panel record to convert.
 * @returns {PanelInfo} The nested panel model.
 */
function normalizeLegacyPanelInfo(aPanelInfo: LegacyFlatPanelInfo): PanelInfo {
    return createNormalizedPanelInfo(normalizeLegacyFlatPanelInfo(aPanelInfo));
}

/**
 * Normalizes legacy flat panel values before they are grouped.
 * Intent: Repair legacy field types so the nested conversion receives clean data.
 * @param {LegacyFlatPanelInfo} aPanelInfo - The legacy flat panel record to normalize.
 * @returns {LegacyFlatPanelInfo} The normalized legacy flat panel record.
 */
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

/**
 * Builds the nested panel model from normalized legacy panel data.
 * Intent: Assemble the modern panel object from the repaired legacy fields.
 * @param {ReturnType<typeof normalizeLegacyFlatPanelInfo>} aPanelInfo - The normalized legacy panel data.
 * @returns {PanelInfo} The nested panel model.
 */
function createNormalizedPanelInfo(
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
    };
}

/**
 * Resolves the time-range config used to serialize a panel.
 * Intent: Prefer an existing range config and fall back to derived bounds when needed.
 * @param {PanelInfo} aPanelInfo - The panel to inspect.
 * @returns {TimeRangeConfig} The resolved time-range config.
 */
function resolvePanelTimeRangeConfig(aPanelInfo: PanelInfo): TimeRangeConfig {
    return (
        aPanelInfo.time.range_config ??
        normalizeLegacyTimeRangeBoundary(aPanelInfo.time.range_bgn, aPanelInfo.time.range_end)
            .rangeConfig
    );
}

/**
 * Replaces the panel list for the matching board.
 * Intent: Write the updated panels back into the target board only.
 * @param {GBoardListType[]} aBoards - The current board list.
 * @param {string} aBoardId - The board id to update.
 * @param {LegacyFlatPanelInfo[]} aPanels - The panel list to write.
 * @returns {GBoardListType[]} The updated board list.
 */
function updateBoardPanels(
    aBoards: GBoardListType[],
    aBoardId: string,
    aPanels: LegacyFlatPanelInfo[],
): GBoardListType[] {
    return aBoards.map((aBoard) =>
        aBoard.id === aBoardId ? { ...aBoard, panels: aPanels } : aBoard,
    );
}

/**
 * Finds the panel list for a board by id.
 * Intent: Locate the legacy panel collection before applying a mutation.
 * @param {GBoardListType[]} aBoards - The current board list.
 * @param {string} aBoardId - The board id to search for.
 * @returns {LegacyFlatPanelInfo[] | undefined} The matching panel list, or `undefined` if none exists.
 */
function findBoardPanels(
    aBoards: GBoardListType[],
    aBoardId: string,
): LegacyFlatPanelInfo[] | undefined {
    return aBoards.find((aBoard) => aBoard.id === aBoardId)?.panels;
}

/**
 * Converts nested panels into the legacy flat list.
 * Intent: Prepare panel data for storage on the board record.
 * @param {PanelInfo[]} aPanels - The nested panels to convert.
 * @returns {LegacyFlatPanelInfo[]} The legacy flat panel list.
 */
function createLegacyPanelList(aPanels: PanelInfo[]): LegacyFlatPanelInfo[] {
    return aPanels.map((aPanel) => toLegacyFlatPanelInfo(aPanel));
}

/**
 * Replaces one legacy panel entry by key.
 * Intent: Update a single panel while preserving the rest of the list.
 * @param {LegacyFlatPanelInfo[]} aPanels - The legacy panel list to update.
 * @param {string} aPanelKey - The panel key to replace.
 * @param {PanelInfo} aPanelInfo - The new panel data.
 * @returns {LegacyFlatPanelInfo[]} The updated legacy panel list.
 */
function replaceLegacyPanel(
    aPanels: LegacyFlatPanelInfo[],
    aPanelKey: string,
    aPanelInfo: PanelInfo,
): LegacyFlatPanelInfo[] {
    const sSavedPanel = toLegacyFlatPanelInfo(aPanelInfo);

    return aPanels.map((aPanel) => (aPanel.index_key === aPanelKey ? sSavedPanel : aPanel));
}

/**
 * Removes one legacy panel entry by key.
 * Intent: Delete a panel from the stored board list.
 * @param {LegacyFlatPanelInfo[]} aPanels - The legacy panel list to filter.
 * @param {string} aPanelKey - The panel key to remove.
 * @returns {LegacyFlatPanelInfo[]} The panel list without the matching entry.
 */
function removeLegacyPanel(
    aPanels: LegacyFlatPanelInfo[],
    aPanelKey: string,
): LegacyFlatPanelInfo[] {
    return aPanels.filter((aPanel) => aPanel.index_key !== aPanelKey);
}

/**
 * Converts a legacy numeric field into a number.
 * Intent: Coerce string-based storage values into safe numeric defaults.
 * @param {number | string | undefined} aValue - The legacy value to normalize.
 * @returns {number} The numeric value, or `0` when the field is empty.
 */
function normalizeNumericValue(aValue: number | string | undefined): number {
    if (aValue === undefined || aValue === '') {
        return 0;
    }

    return typeof aValue === 'number' ? aValue : Number(aValue);
}

/**
 * Normalizes the legacy time keeper field into an optional object.
 * Intent: Drop empty-string sentinels before building the nested model.
 * @param {Partial<TimeRangePair> | '' | undefined} aTimeKeeper - The legacy time keeper value.
 * @returns {Partial<TimeRangePair> | undefined} The normalized time keeper, or `undefined`.
 */
function normalizeLegacyTimeKeeper(
    aTimeKeeper: Partial<TimeRangePair> | '' | undefined,
): Partial<TimeRangePair> | undefined {
    return aTimeKeeper === '' ? undefined : aTimeKeeper;
}
