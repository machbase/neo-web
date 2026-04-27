import { getId } from '@/utils';
import { CheckDataCompatibility } from '@/utils/CheckDataCompatibility';
import type { BoardInfo } from '../boardTypes';
import { createPersistedTazBoardInfo } from '../persistence/save/TazBoardSaveMapper';
import {
    createTazSavePayloadFromBoardInfo,
} from '../persistence/save/TazSavePayloadBuilder';
import { parseReceivedBoardInfo } from '../persistence/versionParsing/TazBoardVersionParser';
import { TAZ_FORMAT_VERSION } from '../persistence/versionParsing/TazVersionResolver';
import type {
    PersistedBoardTimeRange,
    PersistedTazBoardInfo,
    PersistedTazBoardInfoV200,
} from '../persistence/TazPersistenceTypes';
import type { StoredTimeValue } from '../time/StoredTimeRangeAdapter';

export type TazBoardTab = {
    id: string;
    type: string;
    name: string;
    path: string;
    code: unknown;
    panels: unknown[];
    boardTimeRange?: PersistedBoardTimeRange | undefined;
    range_bgn?: StoredTimeValue | undefined;
    range_end?: StoredTimeValue | undefined;
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
 * @param {TazBoardTab} board The current TagAnalyzer board tab state.
 * @returns {PersistedTazBoardInfoV200} The saved `.taz` payload.
 */
export function createTazSavePayload(board: TazBoardTab): PersistedTazBoardInfoV200 {
    const sRuntimeBoard = parseReceivedBoardInfo(board as PersistedTazBoardInfo);

    return createTazSavePayloadFromBoardInfo(sRuntimeBoard);
}

/**
 * Builds the in-memory board state that matches the existing-file save flow in `MainContent.tsx`.
 * Intent: Keep post-save tab updates near workspace state helpers instead of the persistence mapper layer.
 * @param {TazBoardTab} board The current TagAnalyzer board tab state.
 * @returns {TazBoardTab} The board state after a successful save of an existing `.taz` file.
 */
export function createSavedTazBoardAfterSave(board: TazBoardTab): TazBoardTab {
    const sSavePayload = createTazSavePayload(board);

    return createSavedTazBoardSnapshot(
        board,
        sSavePayload,
        board.name,
        board.path,
    );
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
    const sSavePayload = createTazSavePayload(board);

    return createSavedTazBoardSnapshot(board, sSavePayload, fileName, filePath);
}

/**
 * Serializes the saved panel list used by local `.taz` tab dirty-state metadata.
 * Intent: Make the workspace dirty-check rule explicit in one place.
 * @param {TazPanelsCarrier} board The board-like object that owns the saved panels.
 * @returns {string} The serialized panel list snapshot.
 */
export function createTazSavedCode(board: TazPanelsCarrier): string {
    return serializePanels(board.panels);
}

/**
 * Serializes the saved panel list from the normalized `.taz` save payload.
 * Intent: Keep dirty-state metadata aligned with the exact panel shape written to disk.
 * @param {TazPanelsCarrier} savePayload The normalized save payload that owns persisted panels.
 * @returns {string} The serialized persisted panel list snapshot.
 */
export function createTazSavedCodeFromSavePayload(savePayload: TazPanelsCarrier): string {
    return serializePanels(savePayload.panels);
}

/**
 * Serializes the saved panel list directly from the normalized runtime board model.
 * Intent: Reuse the persistence serializer while keeping tab dirty-state logic outside the persistence folder.
 * @param {BoardInfo} board The normalized runtime board model.
 * @returns {string} The serialized saved panel list.
 */
export function createTazSavedCodeFromBoardInfo(board: BoardInfo): string {
    return serializePanels(createPersistedTazBoardInfo(board).panels);
}

function createSavedTazBoardSnapshot(
    board: TazBoardTab,
    savePayload: PersistedTazBoardInfoV200,
    fileName: string,
    filePath: string,
): TazBoardTab {
    return {
        ...board,
        version: TAZ_FORMAT_VERSION,
        name: fileName,
        path: filePath,
        panels: savePayload.panels,
        code: '',
        savedCode: createTazSavedCodeFromSavePayload(savePayload),
    };
}

function serializePanels(panels: unknown[]): string {
    return JSON.stringify(panels);
}
