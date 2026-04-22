import type { GBoardListType } from '@/recoil/recoil';
import type { BoardInfo } from '../boardTypes';
import type { PanelInfo } from '../panelModelTypes';
import {
    createSavePanelInfo,
    type PersistedPanelInfoV201,
} from '../persistence/SavePanelInfo';
import { parseReceivedBoardInfo } from '../persistence/TazBoardParser';
import { TAZ_FORMAT_VERSION } from '../persistence/TazVersion';
import type { TimeRangeConfig } from '../time/timeTypes';
import {
    toLegacyBoolean,
    toLegacySeriesConfigs,
} from './LegacySeriesAdapter';
import {
    normalizeLegacyTimeRangeBoundary,
    toLegacyTimeValue,
} from './LegacyTimeAdapter';
import type {
    LegacyBoardSourceInfo,
    LegacyFlatPanelInfo,
    PersistedTazPanelInfo,
} from './LegacyTypes';

/**
 * Converts received board data into the runtime board model.
 * Intent: Preserve the existing adapter entry point while delegating version parsing to the dedicated parser.
 * @param {LegacyBoardSourceInfo} aBoardInfo The received board data to convert.
 * @returns {BoardInfo} The runtime board model.
 */
export function normalizeBoardInfo(aBoardInfo: LegacyBoardSourceInfo): BoardInfo {
    return parseReceivedBoardInfo(aBoardInfo);
}

/**
 * Flattens nested panel data into the legacy storage shape.
 * Intent: Preserve the existing legacy serializer for older `.taz` files and legacy-focused tests.
 * @param {PanelInfo} aPanelInfo The nested panel model to convert.
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
 * Replaces one board's panels with a saved panel list.
 * Intent: Persist the current board panel set using the latest explicit `.taz` panel shape.
 * @param {GBoardListType[]} aBoards The current board list.
 * @param {string} aBoardId The board id to update.
 * @param {PanelInfo[]} aPanels The panels to save into the board.
 * @returns {GBoardListType[]} The updated board list.
 */
export function getNextBoardListWithSavedPanels(
    aBoards: GBoardListType[],
    aBoardId: string,
    aPanels: PanelInfo[],
): GBoardListType[] {
    return updateBoardPanels(aBoards, aBoardId, createSavedPanelList(aPanels));
}

/**
 * Replaces one saved panel inside a board panel list.
 * Intent: Update a single saved panel while preserving the rest of the persisted board payload.
 * @param {GBoardListType[]} aBoards The current board list.
 * @param {string} aBoardId The board id to update.
 * @param {string} aPanelKey The panel key to replace.
 * @param {PanelInfo} aPanelInfo The updated panel data.
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

    return updateBoardPanels(aBoards, aBoardId, replaceSavedPanel(sPanels, aPanelKey, aPanelInfo));
}

/**
 * Removes one saved panel from a board panel list.
 * Intent: Drop deleted panels from the persisted board payload regardless of the original save version.
 * @param {GBoardListType[]} aBoards The current board list.
 * @param {string} aBoardId The board id to update.
 * @param {string} aPanelKey The panel key to remove.
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

    return updateBoardPanels(aBoards, aBoardId, removeSavedPanel(sPanels, aPanelKey));
}

/**
 * Builds the persisted `.taz` board info from the runtime board model.
 * Intent: Save versioned `.taz` files with the latest explicit panel field names.
 * @param {BoardInfo} aBoardInfo The runtime board model.
 * @returns {LegacyBoardSourceInfo} The persisted board shape.
 */
export function createLegacyBoardSourceInfo(aBoardInfo: BoardInfo): LegacyBoardSourceInfo {
    return {
        ...aBoardInfo,
        version: TAZ_FORMAT_VERSION,
        panels: createSavedPanelList(aBoardInfo.panels),
        range_bgn: toLegacyTimeValue(aBoardInfo.rangeConfig.start),
        range_end: toLegacyTimeValue(aBoardInfo.rangeConfig.end),
    };
}

function resolvePanelTimeRangeConfig(aPanelInfo: PanelInfo): TimeRangeConfig {
    return (
        aPanelInfo.time.range_config ??
        normalizeLegacyTimeRangeBoundary(aPanelInfo.time.range_bgn, aPanelInfo.time.range_end)
            .rangeConfig
    );
}

function updateBoardPanels(
    aBoards: GBoardListType[],
    aBoardId: string,
    aPanels: PersistedPanelInfoV201[],
): GBoardListType[] {
    return aBoards.map((aBoard) =>
        aBoard.id === aBoardId
            ? ({ ...aBoard, version: TAZ_FORMAT_VERSION, panels: aPanels } as GBoardListType)
            : aBoard,
    );
}

function findBoardPanels(
    aBoards: GBoardListType[],
    aBoardId: string,
): PersistedTazPanelInfo[] | undefined {
    return aBoards.find((aBoard) => aBoard.id === aBoardId)?.panels as
        | PersistedTazPanelInfo[]
        | undefined;
}

function createSavedPanelList(aPanels: PanelInfo[]): PersistedPanelInfoV201[] {
    return aPanels.map((aPanelInfo) => createSavePanelInfo(aPanelInfo));
}

function replaceSavedPanel(
    aPanels: PersistedTazPanelInfo[],
    aPanelKey: string,
    aPanelInfo: PanelInfo,
): PersistedPanelInfoV201[] {
    const sSavedPanel = createSavePanelInfo(aPanelInfo);

    return aPanels.map((aPanel) =>
        getPersistedPanelKey(aPanel) === aPanelKey ? sSavedPanel : (aPanel as PersistedPanelInfoV201),
    );
}

function removeSavedPanel(
    aPanels: PersistedTazPanelInfo[],
    aPanelKey: string,
): PersistedPanelInfoV201[] {
    return aPanels
        .filter((aPanel) => getPersistedPanelKey(aPanel) !== aPanelKey)
        .map((aPanel) => aPanel as PersistedPanelInfoV201);
}

function getPersistedPanelKey(aPanel: PersistedTazPanelInfo): string | undefined {
    if ('index_key' in aPanel && typeof aPanel.index_key === 'string') {
        return aPanel.index_key;
    }

    if (
        'meta' in aPanel &&
        aPanel.meta &&
        typeof aPanel.meta === 'object'
    ) {
        const sMeta = aPanel.meta as Record<string, unknown>;

        if (typeof sMeta.index_key === 'string') {
            return sMeta.index_key;
        }

        if (typeof sMeta.panelKey === 'string') {
            return sMeta.panelKey;
        }
    }

    return undefined;
}
