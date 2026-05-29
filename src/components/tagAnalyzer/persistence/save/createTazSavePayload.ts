import { parseLoadedTaz } from '../load/parseLoadedTaz';
import type {
    PersistedTazBoardInfo,
} from '../TazPersistenceTypesV200';
import type { PersistedTazBoardInfoV204 } from '../TazPersistenceTypesV204';
import { mapBoardToPersistedTaz } from './mapBoardToPersistedTaz';

export function createTazSavePayload(
    board: PersistedTazBoardInfo,
): PersistedTazBoardInfoV204 {
    const sRuntimeBoard = parseLoadedTaz(board);

    return mapBoardToPersistedTaz(sRuntimeBoard);
}
