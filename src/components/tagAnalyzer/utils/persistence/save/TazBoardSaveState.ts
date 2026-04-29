import type { BoardInfo } from '../../../panel/BoardTypes';
import { parseReceivedBoardInfo, TAZ_FORMAT_VERSION } from '../TazLoadParser';
import type {
    PersistedTazBoardInfo,
    PersistedTazBoardInfoV200,
} from '../TazPersistenceTypes';
import { createPersistedTazBoardInfo } from './TazBoardSaveMapper';
import { createTazSavePayloadFromBoardInfo } from './TazSavePayloadBuilder';

export type SaveableTazBoard = PersistedTazBoardInfo & {
    name: string;
    path: string;
    code: unknown;
    savedCode: string | false;
};

type SavedAsTazBoardParams<TBoard extends SaveableTazBoard> = {
    board: TBoard;
    fileName: string;
    filePath: string;
};

type TazPanelsCarrier = {
    panels: unknown[];
};

export function createTazSavePayload(
    board: SaveableTazBoard,
): PersistedTazBoardInfoV200 {
    const sRuntimeBoard = parseReceivedBoardInfo(board as PersistedTazBoardInfo);

    return createTazSavePayloadFromBoardInfo(sRuntimeBoard);
}

export function createSavedTazBoardAfterSave<TBoard extends SaveableTazBoard>(
    board: TBoard,
): TBoard {
    const sSavePayload = createTazSavePayload(board);

    return createSavedTazBoardSnapshot(board, sSavePayload, board.name, board.path);
}

export function createSavedTazBoardAfterSaveAs<TBoard extends SaveableTazBoard>({
    board,
    fileName,
    filePath,
}: SavedAsTazBoardParams<TBoard>): TBoard {
    const sSavePayload = createTazSavePayload(board);

    return createSavedTazBoardSnapshot(board, sSavePayload, fileName, filePath);
}

export function createTazSavedCode(board: TazPanelsCarrier): string {
    return serializePanels(board.panels);
}

export function createTazSavedCodeFromSavePayload(savePayload: TazPanelsCarrier): string {
    return serializePanels(savePayload.panels);
}

export function createTazSavedCodeFromBoardInfo(board: BoardInfo): string {
    return serializePanels(createPersistedTazBoardInfo(board).panels);
}

function createSavedTazBoardSnapshot<TBoard extends SaveableTazBoard>(
    board: TBoard,
    savePayload: PersistedTazBoardInfoV200,
    fileName: string,
    filePath: string,
): TBoard {
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
