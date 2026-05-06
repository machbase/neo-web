import type { BoardInfo } from '../../BoardTypes';
import { parseLoadedTaz, TAZ_FORMAT_VERSION } from '../load/parseLoadedTaz';
import type {
    PersistedTazBoardInfo,
} from '../TazPersistenceTypesV200';
import type { PersistedTazBoardInfoV201 } from '../TazPersistenceTypesV201';
import { mapBoardToPersistedTaz } from './mapBoardToPersistedTaz';
import { createTazSavePayloadFromBoardInfo } from './createTazSavePayload';

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
): PersistedTazBoardInfoV201 {
    const sRuntimeBoard = parseLoadedTaz(board as PersistedTazBoardInfo);

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
    return serializePanels(mapBoardToPersistedTaz(board).panels);
}

function createSavedTazBoardSnapshot<TBoard extends SaveableTazBoard>(
    board: TBoard,
    savePayload: PersistedTazBoardInfoV201,
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
