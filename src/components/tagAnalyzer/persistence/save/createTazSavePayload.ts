import { parseLoadedTaz } from '../load/parseLoadedTaz';
import type {
    PersistedTazBoardInfo,
} from '../TazPersistenceTypesV200';
import type { PersistedTazBoardInfoV210 } from '../TazPersistenceTypesV210';
import { mapBoardToPersistedTaz } from './mapBoardToPersistedTaz';

export function createTazSavePayload(
    board: PersistedTazBoardInfo,
): PersistedTazBoardInfoV210 {
    const sRuntimeBoard = parseLoadedTaz(board);

    return mapBoardToPersistedTaz(sRuntimeBoard);
}
