import type { BoardInfo } from '../../panel/BoardTypes';
import { mapPanelToPersistedTaz } from './mapPanelToPersistedTaz';
import { cloneTimeBoundary } from '../PersistenceCloneUtils';
import type {
    PersistedBoardTimeRange,
    PersistedTazBoardInfoV200,
} from '../TazPersistenceTypesV200';
import { TAZ_FORMAT_VERSION } from '../load/parseLoadedTaz';
import type { TimeRangeConfig } from '../../time/TimeTypes';

/**
 * Builds the persisted `.taz` board payload from the runtime board model.
 * Intent: Keep the latest board serializer in one general persistence file instead of the legacy folder.
 * @param {BoardInfo} boardInfo The runtime board model.
 * @returns {PersistedTazBoardInfoV200} The persisted `.taz` board payload.
 */
export function mapBoardToPersistedTaz(
    boardInfo: BoardInfo,
): PersistedTazBoardInfoV200 {
    return {
        id: boardInfo.id,
        type: boardInfo.type,
        version: TAZ_FORMAT_VERSION,
        boardTimeRange: clonePersistedBoardTimeRange(boardInfo.boardTimeRange),
        panels: boardInfo.panels.map((panelInfo) => mapPanelToPersistedTaz(panelInfo)),
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
