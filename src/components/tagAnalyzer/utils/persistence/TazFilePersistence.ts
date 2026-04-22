import type { GBoardListType } from '@/recoil/recoil';
import { getId } from '@/utils';
import { CheckDataCompatibility } from '@/utils/CheckDataCompatibility';
import type { BoardInfo } from '../boardTypes';
import { createLegacyBoardSourceInfo } from '../legacy/LegacyStorageAdapter';
import type { LegacyBoardSourceInfo } from '../legacy/LegacyTypes';
import { TAZ_FORMAT_VERSION } from './TazVersion';

type LoadedTazBoardParams = {
    rawContent: string;
    fileName: string;
    filePath: string;
    boardId?: string;
};

type SavedAsTazBoardParams = {
    board: GBoardListType;
    fileName: string;
    filePath: string;
};

type TazPanelsCarrier = Pick<GBoardListType, 'panels'>;

/**
 * Builds one loaded TagAnalyzer board tab from raw `.taz` file text.
 * Intent: Keep a TagAnalyzer-local copy of `.taz` hydration logic without editing shared file flows.
 * @param {LoadedTazBoardParams} aParams The raw file text and the tab metadata to assign.
 * @returns {GBoardListType} The hydrated TagAnalyzer board tab ready for Recoil state.
 */
export function createLoadedTazBoard({
    rawContent,
    fileName,
    filePath,
    boardId = getId(),
}: LoadedTazBoardParams): GBoardListType {
    const sLoadedBoard = CheckDataCompatibility(rawContent, 'taz') as GBoardListType;

    return {
        ...sLoadedBoard,
        id: boardId,
        name: fileName,
        type: 'taz',
        path: filePath,
        savedCode: createTazSavedCode(sLoadedBoard) as never,
    };
}

/**
 * Builds the `.taz` payload that should be sent to backend storage.
 * Intent: Strip UI-only transient fields before writing the board JSON to disk.
 * @param {GBoardListType} aBoard The current TagAnalyzer board state.
 * @returns {Record<string, unknown>} The persisted `.taz` payload.
 */
export function createTazSavePayload(aBoard: GBoardListType): Record<string, unknown> {
    const sSavePayload = JSON.parse(JSON.stringify(aBoard)) as Record<string, unknown>;

    sSavePayload.savedCode = '';
    sSavePayload.code = '';

    return sSavePayload;
}

/**
 * Builds the saved `.taz` board shape directly from the normalized runtime board model.
 * Intent: Serialize TagAnalyzer saves from `BoardInfo` into the mapped saved panel format.
 * @param {BoardInfo} aBoard The normalized runtime board model.
 * @returns {LegacyBoardSourceInfo} The saved board shape before transient fields are stripped.
 */
export function createSaveTazBoardInfo(aBoard: BoardInfo): LegacyBoardSourceInfo {
    return createLegacyBoardSourceInfo(aBoard);
}

/**
 * Builds the `.taz` payload that should be written to disk from runtime `BoardInfo`.
 * Intent: Keep `.taz` file saves on the explicit TagAnalyzer runtime model.
 * @param {BoardInfo} aBoard The normalized runtime board model.
 * @returns {LegacyBoardSourceInfo} The persisted `.taz` payload without transient UI fields.
 */
export function createTazSavePayloadFromBoardInfo(aBoard: BoardInfo): LegacyBoardSourceInfo {
    const sSavePayload = createSaveTazBoardInfo(aBoard);

    return {
        ...sSavePayload,
        savedCode: '' as never,
        code: '',
    };
}

/**
 * Builds the in-memory board state that matches the existing-file save flow in `MainContent.tsx`.
 * Intent: Mirror the post-save `.taz` state update locally inside TagAnalyzer.
 * @param {GBoardListType} aBoard The current TagAnalyzer board state.
 * @returns {GBoardListType} The board state after a successful save of an existing `.taz` file.
 */
export function createSavedTazBoardAfterSave(aBoard: GBoardListType): GBoardListType {
    return {
        ...aBoard,
        version: TAZ_FORMAT_VERSION,
        code: '',
        savedCode: createTazSavedCode(aBoard) as never,
    } as GBoardListType;
}

/**
 * Builds the in-memory board state that matches the Save As flow in `SaveModal.tsx`.
 * Intent: Mirror the `.taz` tab metadata update after a successful Save As operation.
 * @param {SavedAsTazBoardParams} aParams The board plus the file name and path chosen during Save As.
 * @returns {GBoardListType} The board state after a successful Save As operation.
 */
export function createSavedTazBoardAfterSaveAs({
    board,
    fileName,
    filePath,
}: SavedAsTazBoardParams): GBoardListType {
    return {
        ...board,
        version: TAZ_FORMAT_VERSION,
        name: fileName,
        path: filePath,
        savedCode: createTazSavedCode(board) as never,
    } as GBoardListType;
}

/**
 * Serializes the saved panel list used by the local tab dirty-state metadata.
 * Intent: Keep the `.taz` saved-code convention explicit and reusable across save flows.
 * @param {TazPanelsCarrier} aBoard The board-like object that owns the saved panels.
 * @returns {string} The serialized panel list snapshot.
 */
export function createTazSavedCode(aBoard: TazPanelsCarrier): string {
    return JSON.stringify(aBoard.panels);
}

/**
 * Serializes the saved panel list directly from the normalized runtime board model.
 * Intent: Keep tab dirty-state metadata aligned with the mapped save snapshot used for `.taz` saves.
 * @param {BoardInfo} aBoard The normalized runtime board model.
 * @returns {string} The serialized saved panel list.
 */
export function createTazSavedCodeFromBoardInfo(aBoard: BoardInfo): string {
    return JSON.stringify(createSaveTazBoardInfo(aBoard).panels);
}
