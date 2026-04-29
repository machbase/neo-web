import { getId } from '@/utils';
import { CheckDataCompatibility } from '@/utils/CheckDataCompatibility';
import { createTazSavedCode } from '../persistence/save/TazBoardSaveState';
import type {
    PersistedBoardTimeRange,
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
