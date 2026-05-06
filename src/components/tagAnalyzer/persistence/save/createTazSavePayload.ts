import type { BoardInfo } from '../../BoardTypes';
import {
    mapBoardToPersistedTaz,
} from './mapBoardToPersistedTaz';
import type { PersistedTazBoardInfoV201 } from '../TazPersistenceTypesV201';

/**
 * Builds the `.taz` payload that should be written to disk from runtime `BoardInfo`.
 * Intent: Keep `.taz` file saves on the explicit TagAnalyzer runtime model.
 * @param {BoardInfo} board The normalized runtime board model.
 * @returns {PersistedTazBoardInfoV201} The persisted `.taz` payload without transient UI fields.
 */
export function createTazSavePayloadFromBoardInfo(
    board: BoardInfo,
): PersistedTazBoardInfoV201 {
    return mapBoardToPersistedTaz(board);
}
