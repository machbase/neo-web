import {getRequestSession} from '@/api/core/requestSession';
import { postFileList } from '@/api/repository/api';
import { saveTazBoard } from '@/components/tagAnalyzer/persistence/tazDocumentService';
import { isTabOnFile } from './boardAfterOverwrite';
import { getBoardSaveData, applyBoardSaveResult } from './boardSaveResult';
import { getFileRequestFailure, isSuccessfulFileWrite } from './fileRequestResult';
import { observeFileIdentity, observeFileAccess } from './fileExistence';
import { getFileLookupKey, hasFileIdentity } from './fileIdentity';
import { loadBoardFromFile } from '@/components/side/FileExplorer/loadBoardFromFile';
import { beginBoardSave, hasPendingBoardSave, type FileWriteContext, type FileWriteOptions } from '@/api/repository/fileWriteQueue';
export {hasPendingBoardSave};

type SaveOwner = { id: string; name: string; path: string; type: string };
type SaveTarget = {name: string; path: string};
export type BoardFileSaveContext = {
    isSaving: (board: {id: string; path?: string; name?: string}) => boolean;
    isLatestAction: boolean;
};

/** One lifecycle for manual Save, Save As and automatic saves. Format-specific
 * serialization stays in the existing text/WRK/DSH and TAZ implementations. */
export const saveBoardFile = async (options: {
    board: SaveOwner & Record<string, any>;
    target?: {name: string; path: string};
    fileType?: string;
    saveAs?: boolean;
    beforeWrite?: () => Promise<boolean>;
    /** Pure final guard: unlike beforeWrite, this never repeats a confirmation. */
    canWrite?: () => boolean;
    canApply?: () => boolean;
    getSaveBoards?: () => {id?: string; path: string; name: string}[];
    onSuccess: (submitted: any, context: BoardFileSaveContext) => void;
    onUncertain: (target?: SaveTarget) => void;
    onRead?: (loaded: any) => void;
    onFailure?: (reason: string) => void;
}): Promise<boolean> => {
    const {target = options.board, fileType = options.board.type, canApply = () => true} = options;
    // Neither queued writes nor their acknowledgement may observe later mutation.
    const board = JSON.parse(JSON.stringify(options.board));
    const submitted = fileType === 'taz' ? undefined : JSON.parse(JSON.stringify(getBoardSaveData(board, fileType)) ?? 'null');
    const action = beginBoardSave(board.id);
    const session = getRequestSession();
    const context = (write: FileWriteContext): BoardFileSaveContext => ({
        isSaving: other => action.isSaving(other.id) ||
            !!other.path && other.name !== undefined && write.hasPendingWrite(other.path + other.name),
        isLatestAction: canApply() && action.isLatest(),
    });
    // Re-read the open tabs after each lookup. Tabs can be opened while either
    // the HTTP write or an alias lookup waits; a pre-write snapshot is not enough.
    let aliasObservations = 0;
    const identifyOpenAliases = async (canContinue: () => boolean): Promise<SaveTarget[]> => {
        const checked = new Set<string>(), unknown: SaveTarget[] = [];
        const targetPath = target.path + target.name;
        while (canContinue()) {
            const peer = options.getSaveBoards?.().find(peer => {
                const path = peer.path + peer.name;
                return peer.path && path !== targetPath && !checked.has(path) && !hasFileIdentity(path) &&
                    getFileLookupKey(path) === getFileLookupKey(targetPath);
            });
            if (!peer) break;
            checked.add(peer.path + peer.name);
            const decision = await observeFileIdentity(peer.path, peer.name, canContinue);
            aliasObservations++;
            if (decision.status !== 'none' && decision.status !== 'confirmed') unknown.push(peer);
        }
        return unknown;
    };
    const acknowledge = async (write: FileWriteContext, apply: () => void, confirmed?: any) => {
        // Record the writer's known result before any optional peer observation.
        // A lookup failure must never erase a real successful acknowledgement.
        if (!write.isCurrent()) return;
        apply();
        const beforeObservations = aliasObservations;
        const unknown = await identifyOpenAliases(write.isCurrent);
        if (!write.isCurrent()) return;
        if (confirmed && aliasObservations !== beforeObservations) options.onRead?.(confirmed);
        for (const peer of unknown) options.onUncertain(peer);
        const targetPath = target.path + target.name;
        const peers = options.getSaveBoards?.().filter(peer => peer.path && peer.path + peer.name !== targetPath &&
            getFileLookupKey(peer.path + peer.name) === getFileLookupKey(targetPath) &&
            (!hasFileIdentity(targetPath) || !hasFileIdentity(peer.path + peer.name))) ?? [];
        for (const peer of peers) {
            if (!write.isCurrent()) return;
            const loaded = await loadBoardFromFile(peer, undefined, write.read);
            if (!write.isCurrent()) return;
            if (loaded.board && options.onRead) options.onRead(loaded.board);
            else options.onUncertain(peer);
        }
    };
    const canWrite = (write: FileWriteContext) => {
        if (!write.isCurrent() || !canApply() || !(options.canWrite?.() ?? true)) return false;
        const owner = options.getSaveBoards?.().find(peer => peer.id === board.id);
        return !!(options.saveAs || !owner || isTabOnFile({...owner, id: board.id}, board, true));
    };
    const writeOptions: FileWriteOptions = {
        canRetry: canWrite,
        prepare: write => observeFileAccess(target.path + target.name, () => write.isCurrent() && session === getRequestSession() && canApply() && (options.canWrite?.() ?? true)),
        onBlocked: reason => {
            if (canApply() && (options.canWrite?.() ?? true)) options.onFailure?.(reason);
        },
        beforeWrite: async write => {
            if (options.beforeWrite && !await options.beforeWrite()) return false;
            const canContinue = () => canWrite(write);
            if (!canContinue()) return false;
            // A fresh page can open a case alias from Recent beside the tree's
            // spelling. Ordinary Save also needs the server's file relation.
            // Save As supplies its own interactive final check in this queue.
            if (!options.saveAs && !hasFileIdentity(target.path + target.name)) {
                const decision = await observeFileIdentity(target.path, target.name, canContinue);
                if (decision.status !== 'none' && decision.status !== 'confirmed') return false;
            }
            if ((await identifyOpenAliases(canContinue)).length) return false;
            return canContinue();
        },
        onResult: async (result, write) => {
            if (isSuccessfulFileWrite(result)) await acknowledge(write, () => options.onSuccess(submitted, context(write)), {...applyBoardSaveResult(board, fileType, submitted), path: target.path, name: target.name});
        },
        // The queue owns file/session cancellation. Closing the source editor
        // cannot discard a write's result for other surviving tabs on that file.
        onUncertain: write => acknowledge(write, () => options.onUncertain()),
        onRejected: async write => {
            await acknowledge(write, () => options.onUncertain(target));
            const loaded = await loadBoardFromFile(target, undefined, write.read);
            if (write.isCurrent() && loaded.board) options.onRead?.(loaded.board);
        },
    };
    try {
        if (session !== getRequestSession()) return false;
        if (fileType === 'taz') {
            return !!await saveTazBoard({...board, name: target.name, path: target.path}, {
                ...writeOptions,
                onResult: undefined,
                onSaved: (saved, write) => acknowledge(write, () => options.onSuccess(saved, context(write)), saved),
            });
        }
        const result = await postFileList(submitted, target.path, target.name, writeOptions);
        const success = isSuccessfulFileWrite(result);
        if (!success && !result?.fileMutationBlocked && canApply() && (options.canWrite?.() ?? true)) options.onFailure?.(getFileRequestFailure(result)?.reason ?? 'Failed to save the file.');
        return success;
    } finally {
        action.finish();
    }
};
