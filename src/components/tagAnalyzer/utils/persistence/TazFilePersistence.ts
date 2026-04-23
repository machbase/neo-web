import type { BoardInfo } from '../boardTypes';
import {
    createPersistedTazBoardInfo,
} from './TazBoardStatePersistence';
import type { PersistedTazBoardInfo } from './TazPersistenceTypes';

/**
 * Builds the saved `.taz` board shape directly from the normalized runtime board model.
 * Intent: Serialize TagAnalyzer saves from `BoardInfo` into the mapped saved panel format.
 * @param {BoardInfo} aBoard The normalized runtime board model.
 * @returns {PersistedTazBoardInfo} The saved board shape before transient fields are stripped.
 */
export function createSaveTazBoardInfo(aBoard: BoardInfo): PersistedTazBoardInfo {
    return createPersistedTazBoardInfo(aBoard);
}

/**
 * Builds the `.taz` payload that should be written to disk from runtime `BoardInfo`.
 * Intent: Keep `.taz` file saves on the explicit TagAnalyzer runtime model.
 * @param {BoardInfo} aBoard The normalized runtime board model.
 * @returns {PersistedTazBoardInfo} The persisted `.taz` payload without transient UI fields.
 */
export function createTazSavePayloadFromBoardInfo(aBoard: BoardInfo): PersistedTazBoardInfo {
    const sSavePayload = createSaveTazBoardInfo(aBoard);

    return {
        ...sSavePayload,
        savedCode: '',
        code: '',
    };
}
