import type { BoardInfo } from '../../domain/BoardDomain';
import { parseLoadedTaz } from '../load/parseLoadedTaz';
import { isPersistedPanelInfoV210 } from '../load/parseLoadedPanelTazVer210';
import type {
    PersistedTazBoardInfo,
} from '../TazPersistenceTypesV200';
import type { PersistedTazBoardInfoV210 } from '../TazPersistenceTypesV210';
import { mapBoardToPersistedTaz } from './mapBoardToPersistedTaz';

export function createTazSavePayload(
    board: PersistedTazBoardInfo,
): PersistedTazBoardInfoV210 {
    if (isRuntimeTazBoard(board)) {
        return mapBoardToPersistedTaz(board);
    }

    const sRuntimeBoard = parseLoadedTaz(board);

    return mapBoardToPersistedTaz(sRuntimeBoard);
}

function isRuntimeTazBoard(board: PersistedTazBoardInfo): board is BoardInfo {
    return (
        board.boardTimeRange !== undefined &&
        board.panels.every(isPersistedPanelInfoV210)
    );
}
