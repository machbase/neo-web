import type { BoardInfo } from '../../domain/BoardDomain';
import { mapPanelToPersistedTaz } from './mapPanelToPersistedTaz';
import { cloneTimeBoundary } from '../PersistenceCloneUtils';
import type {
    PersistedBoardTimeRange,
} from '../TazPersistenceTypesV200';
import type { PersistedTazBoardInfoV210 } from '../TazPersistenceTypesV210';
import { TAZ_FORMAT_VERSION } from '../load/parseLoadedTaz';
import type { TimeRangeConfig } from '../../domain/time/model/TimeTypes';
export function mapBoardToPersistedTaz(
    boardInfo: BoardInfo,
): PersistedTazBoardInfoV210 {
    return {
        id: boardInfo.id,
        type: boardInfo.type,
        version: TAZ_FORMAT_VERSION,
        boardTimeRange: clonePersistedBoardTimeRange(boardInfo.boardTimeRange),
        panels: boardInfo.panels.map((panelInfo) => mapPanelToPersistedTaz(panelInfo)),
    };
}
function clonePersistedBoardTimeRange(
    rangeConfig: TimeRangeConfig,
): PersistedBoardTimeRange {
    return {
        start: cloneTimeBoundary(rangeConfig.start),
        end: cloneTimeBoundary(rangeConfig.end),
    };
}

