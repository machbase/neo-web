import type { BoardInfo } from '../../domain/BoardModel';
import {
    mapBoardToPersistedTaz,
} from './mapBoardToPersistedTaz';
import type { PersistedTazBoardInfoV201 } from '../TazPersistenceTypesV201';
export function createTazSavePayloadFromBoardInfo(
    board: BoardInfo,
): PersistedTazBoardInfoV201 {
    return mapBoardToPersistedTaz(board);
}
