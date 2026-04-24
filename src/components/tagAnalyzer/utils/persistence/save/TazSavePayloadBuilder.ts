import type { BoardInfo } from '../../boardTypes';
import {
    createPersistedTazBoardInfo,
} from './TazBoardSaveMapper';
import type { PersistedTazBoardInfoV207 } from '../TazPersistenceTypes';

/**
 * Builds the `.taz` payload that should be written to disk from runtime `BoardInfo`.
 * Intent: Keep `.taz` file saves on the explicit TagAnalyzer runtime model.
 * @param {BoardInfo} aBoard The normalized runtime board model.
 * @returns {PersistedTazBoardInfoV207} The persisted `.taz` payload without transient UI fields.
 */
export function createTazSavePayloadFromBoardInfo(
    aBoard: BoardInfo,
): PersistedTazBoardInfoV207 {
    return createPersistedTazBoardInfo(aBoard);
}
