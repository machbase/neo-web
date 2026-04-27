import type { BoardInfo } from '../../boardTypes';
import { createPersistedPanelInfo } from './TazPanelSaveMapper';
import type {
    PersistedBoardTimeRange,
    PersistedTazBoardInfoV200,
} from '../TazPersistenceTypes';
import { TAZ_FORMAT_VERSION } from '../versionParsing/TazVersionResolver';
import type { TimeBoundary, TimeRangeConfig } from '../../time/types/TimeTypes';

/**
 * Builds the persisted `.taz` board payload from the runtime board model.
 * Intent: Keep the latest board serializer in one general persistence file instead of the legacy folder.
 * @param {BoardInfo} boardInfo The runtime board model.
 * @returns {PersistedTazBoardInfoV200} The persisted `.taz` board payload.
 */
export function createPersistedTazBoardInfo(
    boardInfo: BoardInfo,
): PersistedTazBoardInfoV200 {
    return {
        id: boardInfo.id,
        type: boardInfo.type,
        version: TAZ_FORMAT_VERSION,
        boardTimeRange: clonePersistedBoardTimeRange(boardInfo.rangeConfig),
        panels: boardInfo.panels.map((panelInfo) => createPersistedPanelInfo(panelInfo)),
    };
}

/**
 * Clones the structured board time range for persistence.
 * Intent: Save the active board time config without leaking runtime object references.
 * @param {TimeRangeConfig} rangeConfig The runtime board time range config.
 * @returns {PersistedBoardTimeRange} The cloned persisted board time range.
 */
function clonePersistedBoardTimeRange(
    rangeConfig: TimeRangeConfig,
): PersistedBoardTimeRange {
    return {
        start: cloneTimeBoundary(rangeConfig.start),
        end: cloneTimeBoundary(rangeConfig.end),
    };
}

/**
 * Clones one time boundary for persisted board time.
 * Intent: Keep board time save output explicit for every boundary variant.
 * @param {TimeBoundary} boundary The boundary to clone.
 * @returns {TimeBoundary} The cloned boundary.
 */
function cloneTimeBoundary(boundary: TimeBoundary): TimeBoundary {
    switch (boundary.kind) {
        case 'empty':
            return { kind: 'empty' };
        case 'absolute':
            return {
                kind: 'absolute',
                timestamp: boundary.timestamp,
            };
        case 'relative':
            return {
                kind: 'relative',
                anchor: boundary.anchor,
                amount: boundary.amount,
                unit: boundary.unit,
                expression: boundary.expression,
            };
        case 'raw':
            return {
                kind: 'raw',
                value: boundary.value,
            };
    }
}
