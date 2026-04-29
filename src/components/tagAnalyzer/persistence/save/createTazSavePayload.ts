import type { BoardInfo } from '../../panel/BoardTypes';
import {
    mapBoardToPersistedTaz,
} from './mapBoardToPersistedTaz';
import type { PersistedTazBoardInfoV200 } from '../TazPersistenceTypesV200';

/**
 * Builds the `.taz` payload that should be written to disk from runtime `BoardInfo`.
 * Intent: Keep `.taz` file saves on the explicit TagAnalyzer runtime model.
 * @param {BoardInfo} board The normalized runtime board model.
 * @returns {PersistedTazBoardInfoV200} The persisted `.taz` payload without transient UI fields.
 */
export function createTazSavePayloadFromBoardInfo(
    board: BoardInfo,
): PersistedTazBoardInfoV200 {
    return mapBoardToPersistedTaz(board);
}
