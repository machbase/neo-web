import { parseLoadedTaz } from '../load/parseLoadedTaz';
import type {
    PersistedTazBoardInfo,
} from '../TazPersistenceTypesV200';
import type { PersistedTazBoardInfoV203 } from '../TazPersistenceTypesV203';
import { mapBoardToPersistedTaz } from './mapBoardToPersistedTaz';

export function createTazSavePayload(
    board: PersistedTazBoardInfo,
): PersistedTazBoardInfoV203 {
    const sRuntimeBoard = parseLoadedTaz(board);

    return mapBoardToPersistedTaz(sRuntimeBoard);
}
