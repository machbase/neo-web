import { ensureUniquePanelKeys } from '../panel/panelModel';
import { restorePanel, type PanelRestoreInput } from '../panel/panelReconstruction';
import type { BoardInfo } from './boardModel';

export type BoardRestoreInput = Omit<BoardInfo, 'panels'> & {
    panels: PanelRestoreInput[];
};

export function restoreBoard(input: BoardRestoreInput): BoardInfo {
    return {
        ...input,
        panels: ensureUniquePanelKeys(input.panels.map(restorePanel)),
    };
}
