import type { BoardInfo } from '../../domain/BoardDomain';
import { mapPanelToPersistedTaz } from './mapPanelToPersistedTaz';
import type { PersistedTazBoardInfoV210 } from '../TazPersistenceTypesV210';
import { TAZ_FORMAT_VERSION } from '../TazVersion';

export function mapBoardToPersistedTaz(
    boardInfo: BoardInfo,
): PersistedTazBoardInfoV210 {
    return {
        id: boardInfo.id,
        type: boardInfo.type,
        version: TAZ_FORMAT_VERSION,
        boardTimeRange: {
            start: boardInfo.boardTimeRange.start,
            end: boardInfo.boardTimeRange.end,
        },
        panels: boardInfo.panels.map((panelInfo) => mapPanelToPersistedTaz(panelInfo)),
    };
}

