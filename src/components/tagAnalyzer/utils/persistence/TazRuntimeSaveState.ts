import { atom } from 'recoil';
import type { BoardInfo } from '../boardTypes';

/**
 * Stores the latest normalized TagAnalyzer board snapshots keyed by board id.
 * Intent: Let `.taz` file saves serialize from runtime `BoardInfo` instead of `gBoardList`.
 */
export const gTazRuntimeSaveBoardInfo = atom<Record<string, BoardInfo>>({
    key: 'gTazRuntimeSaveBoardInfo',
    default: {},
});
