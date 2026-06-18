import { parseLoadedTaz } from '../load/parseLoadedTaz';
import type {
    PersistedTazBoardInfo,
} from '../TazPersistenceTypesV200';
import type { PersistedTazBoardInfoV205 } from '../TazPersistenceTypesV205';
import { mapBoardToPersistedTaz } from './mapBoardToPersistedTaz';

export function createTazSavePayload(
    board: PersistedTazBoardInfo,
): PersistedTazBoardInfoV205 {
    const sRuntimeBoard = parseLoadedTaz(board);

    return mapBoardToPersistedTaz(sRuntimeBoard);
}
