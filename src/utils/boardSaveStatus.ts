import { deepEqual, isValidJSON } from '@/utils';

// Tab types that are always considered "saved" (no unsaved indicator)
const ALWAYS_SAVED_TYPES = ['appStore', 'appView', 'DBTable', 'camera', 'blackboxsvr', 'event', 'unknown'];

/**
 * Determine whether a board (tab) has unsaved changes.
 * Returns true if the board is saved (no changes), false if unsaved.
 */
export const isBoardSaved = (board: any): boolean => {
    if (ALWAYS_SAVED_TYPES.includes(board.type)) return true;

    switch (board.type) {
        case 'sql':
        case 'tql':
        case 'json':
        case 'csv':
        case 'md':
        case 'html':
        case 'txt':
        case 'css':
        case 'js':
            return board.code === board.savedCode;
        case 'wrk':
            return JSON.stringify(board.sheet) === board.savedCode;
        case 'dsh':
            if (board.savedCode && typeof board.savedCode === 'string' && isValidJSON(board.savedCode)) {
                return JSON.stringify(board.dashboard) === board.savedCode;
            }
            return false;
        case 'taz':
            if (board.savedCode && typeof board.savedCode === 'string' && isValidJSON(board.savedCode)) {
                return deepEqual(board.panels, JSON.parse(board.savedCode));
            }
            return false;
        case 'new':
        case 'term':
            return board.savedCode === board.savedCode;
        case 'key':
        case 'bridge':
        case 'subscriber':
            return !!board.savedCode;
        case 'timer':
            if (board.code && board.savedCode) {
                return (
                    JSON.stringify(
                        Object.keys(board.code)
                            .sort()
                            .reduce((obj: any, key: string) => {
                                obj[key] = board.code[key];
                                return obj;
                            }, {})
                    ) ===
                    JSON.stringify(
                        Object.keys(board.savedCode)
                            .sort()
                            .reduce((obj: any, key: string) => {
                                obj[key] = board.savedCode[key];
                                return obj;
                            }, {})
                    )
                );
            }
            return false;
        case 'shell-manage':
            return JSON.stringify(board.code) === JSON.stringify(board.savedCode);
        case 'backupdb':
            return board?.code?.path !== '';
        default:
            return board.code === board.savedCode;
    }
};
