import { useRecoilCallback, useSetRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import type { FileMoveHandlers } from '@/api/repository/fileTree';
import type {FileMutationContext} from '@/api/repository/fileWriteQueue';
import { observeFileIdentity } from '@/utils/fileExistence';
import { applyFileDeleteResult, applyFileMoveResult, applyFileReadResult } from '@/utils/boardSaveResult';
import { readBoardSnapshots } from '@/components/side/FileExplorer/loadBoardFromFile';
import {createNewBoardTab} from '@/components/mainContent/tabCloseUtils';

/** Rename, drag and deletion share identity, result publication and readback. */
export const useFileMutationTabs = (): ((source: string) => FileMoveHandlers) => {
    const getBoards = useRecoilCallback(({snapshot}) => () => snapshot.getLoadable(gBoardList).getValue(), []);
    const setBoards = useSetRecoilState(gBoardList);
    const refresh = (context: FileMutationContext, paths: Iterable<string>) => readBoardSnapshots(paths, context,
        loaded => setBoards(boards => applyFileReadResult(boards, loaded)));
    const deleted = useRecoilCallback(({snapshot, set}) => (source: string, context: FileMutationContext) => {
        if (!context.isCurrent()) return;
        let next = applyFileDeleteResult(snapshot.getLoadable(gBoardList).getValue(), path => context.scope.relation(path, source));
        if (next.length === 0) next = [createNewBoardTab()];
        set(gBoardList, next);
        set(gSelectedTab, selected => next.some(board => board.id === selected) ? selected : next[0].id);
    }, []);
    return source => ({
        prepare: async ({scope, isCurrent}, requestedPaths) => {
            const paths = new Set(requestedPaths ?? [source, ...getBoards().filter(board => board.path && scope.relation(board.path + board.name, source) !== 'different')
                .map(board => board.path + board.name)]);
            for (const path of paths) {
                if (!isCurrent()) return;
                const separator = path.lastIndexOf('/');
                await observeFileIdentity(path.slice(0, separator + 1), path.slice(separator + 1), isCurrent);
            }
        },
        onMoved: async context => {
            const {destination} = context;
            const targets = new Set(getBoards().filter(board => board.path && board.savedCode === false)
                .map(board => destination(board.path + board.name)).filter((path): path is string => typeof path === 'string'));
            setBoards(boards => applyFileMoveResult(boards, destination));
            // Read an unknown baseline only after a confirmed move.
            // Reuse the loader after confirmation, retaining every editor's draft.
            await refresh(context, targets);
        },
        onDeleted: context => deleted(source, context),
        onRejected: context => refresh(context, getBoards()
            .filter(board => board.path && context.scope(board.path + board.name) !== undefined)
            .map(board => board.path + board.name)),
        // An unknown move keeps its last binding and draft. The file reservation
        // blocks stale-path writes; it is not converted into a new unbound file.
    });
};

// Keep existing callers/tests on the same implementation while deletion shares it.
export const useFileMoveTabs = useFileMutationTabs;
