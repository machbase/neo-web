import { getId } from '@/utils';
import { CheckDataCompatibility } from '@/utils/CheckDataCompatibility';
import type { BoardInfo } from '../boardTypes';
import { createPersistedTazBoardInfo } from '../persistence/save/TazBoardSaveMapper';
import { TAZ_FORMAT_VERSION } from '../persistence/versionParsing/TazVersionResolver';

export type TazBoardTab = {
    id: string;
    type: string;
    name: string;
    path: string;
    code: unknown;
    panels: unknown[];
    range_bgn: string;
    range_end: string;
    sheet?: unknown[];
    shell?: unknown;
    savedCode: string | false;
    dashboard?: unknown;
    refreshKey?: unknown;
    mode?: unknown;
    version?: string;
};

type LoadedTazBoardParams = {
    rawContent: string;
    fileName: string;
    filePath: string;
    boardId?: string;
};

type SavedAsTazBoardParams = {
    board: TazBoardTab;
    fileName: string;
    filePath: string;
};

type TazPanelsCarrier = {
    panels: unknown[];
};

/**
 * Builds one loaded TagAnalyzer board tab from raw `.taz` file text.
 * Intent: Keep `.taz` tab hydration close to the workspace tab model instead of the persistence boundary.
 * @param {LoadedTazBoardParams} aParams The raw file text and the tab metadata to assign.
 * @returns {TazBoardTab} The hydrated TagAnalyzer board tab ready for Recoil state.
 */
export function createLoadedTazBoard({
    rawContent,
    fileName,
    filePath,
    boardId = getId(),
}: LoadedTazBoardParams): TazBoardTab {
    const sLoadedBoard = CheckDataCompatibility(rawContent, 'taz') as TazBoardTab;

    return {
        ...sLoadedBoard,
        id: boardId,
        name: fileName,
        type: 'taz',
        path: filePath,
        savedCode: createTazSavedCode(sLoadedBoard),
    };
}

/**
 * Builds the `.taz` payload that should be sent to backend storage.
 * Intent: Strip workspace-only transient fields before the file save path writes the tab payload.
 * @param {TazBoardTab} aBoard The current TagAnalyzer board tab state.
 * @returns {Record<string, unknown>} The saved `.taz` payload.
 */
export function createTazSavePayload(aBoard: TazBoardTab): Record<string, unknown> {
    const sSavePayload = JSON.parse(JSON.stringify(aBoard)) as Record<string, unknown>;

    sSavePayload.savedCode = '';
    sSavePayload.code = '';

    return sSavePayload;
}

/**
 * Builds the in-memory board state that matches the existing-file save flow in `MainContent.tsx`.
 * Intent: Keep post-save tab updates near workspace state helpers instead of the persistence mapper layer.
 * @param {TazBoardTab} aBoard The current TagAnalyzer board tab state.
 * @returns {TazBoardTab} The board state after a successful save of an existing `.taz` file.
 */
export function createSavedTazBoardAfterSave(aBoard: TazBoardTab): TazBoardTab {
    return {
        ...aBoard,
        version: TAZ_FORMAT_VERSION,
        code: '',
        savedCode: createTazSavedCode(aBoard),
    };
}

/**
 * Builds the in-memory board state that matches the Save As flow in `SaveModal.tsx`.
 * Intent: Keep `.taz` tab metadata updates with other workspace save helpers.
 * @param {SavedAsTazBoardParams} aParams The board plus the file name and path chosen during Save As.
 * @returns {TazBoardTab} The board state after a successful Save As operation.
 */
export function createSavedTazBoardAfterSaveAs({
    board,
    fileName,
    filePath,
}: SavedAsTazBoardParams): TazBoardTab {
    return {
        ...board,
        version: TAZ_FORMAT_VERSION,
        name: fileName,
        path: filePath,
        savedCode: createTazSavedCode(board),
    };
}

/**
 * Serializes the saved panel list used by local `.taz` tab dirty-state metadata.
 * Intent: Make the workspace dirty-check rule explicit in one place.
 * @param {TazPanelsCarrier} aBoard The board-like object that owns the saved panels.
 * @returns {string} The serialized panel list snapshot.
 */
export function createTazSavedCode(aBoard: TazPanelsCarrier): string {
    return JSON.stringify(aBoard.panels);
}

/**
 * Serializes the saved panel list directly from the normalized runtime board model.
 * Intent: Reuse the persistence serializer while keeping tab dirty-state logic outside the persistence folder.
 * @param {BoardInfo} aBoard The normalized runtime board model.
 * @returns {string} The serialized saved panel list.
 */
export function createTazSavedCodeFromBoardInfo(aBoard: BoardInfo): string {
    return JSON.stringify(createPersistedTazBoardInfo(aBoard).panels);
}
