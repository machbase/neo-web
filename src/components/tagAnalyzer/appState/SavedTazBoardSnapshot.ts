import type { BoardInfo } from '../domain/BoardDomain';
import { TAZ_FORMAT_VERSION } from '../persistence/load/parseLoadedTaz';
import type {
    PersistedTazBoardInfo,
} from '../persistence/TazPersistenceTypesV200';
import type { PersistedTazBoardInfoV204 } from '../persistence/TazPersistenceTypesV204';
import { createTazSavePayload } from '../persistence/save/createTazSavePayload';
import { mapBoardToPersistedTaz } from '../persistence/save/mapBoardToPersistedTaz';

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
    return serializePanels(mapBoardToPersistedTaz(board).panels);
}

function createSavedTazBoardSnapshot<TBoard extends SaveableTazBoard>(
    board: TBoard,
    savePayload: PersistedTazBoardInfoV204,
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
