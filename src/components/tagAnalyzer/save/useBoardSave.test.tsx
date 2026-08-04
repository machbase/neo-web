import { act, renderHook, waitFor } from '@testing-library/react';
import { Toast } from '@/design-system/components';
import type { BoardInfo } from '../board/boardModel';
import * as tazDocumentService from '../persistence/tazDocumentService';
import { useBoardSave } from './useBoardSave';

function createBoard(overrides: Partial<BoardInfo> = {}): BoardInfo {
    return {
        id: 'board-a',
        type: 'taz',
        name: 'board.taz',
        path: '/',
        code: '',
        panels: [],
        boardTimeRange: { start: '', end: '' },
        boardNumericRange: { start: '', end: '' },
        savedCode: false,
        ...overrides,
    };
}

function createDeferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((resolvePromise) => {
        resolve = resolvePromise;
    });
    return { promise, resolve };
}

function renderBoardSave(board = createBoard(), isActive = true) {
    const applySaveResult = jest.fn();
    const onSavedBoard = jest.fn();
    const onFileSaved = jest.fn().mockResolvedValue(undefined);
    const hook = renderHook(
        ({ currentBoard, active }) => useBoardSave({
            board: currentBoard,
            isActive: active,
            applySaveResult,
            onSavedBoard,
            onFileSaved,
        }),
        { initialProps: { currentBoard: board, active: isActive } },
    );

    return {
        ...hook,
        applySaveResult,
        onSavedBoard,
        onFileSaved,
    };
}

beforeEach(() => {
    jest.spyOn(tazDocumentService, 'isTazBoardSaved').mockReturnValue(false);
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('useBoardSave', () => {
    it('opens Save As instead of persisting a pathless board', async () => {
        const saveSpy = jest.spyOn(tazDocumentService, 'saveTazBoard');
        const hook = renderBoardSave(createBoard({ path: '' }));

        let didSave: boolean | undefined;
        await act(async () => {
            didSave = await hook.result.current.save();
        });

        expect(didSave).toBe(false);
        expect(hook.result.current.isSaveAsOpen).toBe(true);
        expect(saveSpy).not.toHaveBeenCalled();

        hook.rerender({
            currentBoard: createBoard({ path: '' }),
            active: false,
        });
        expect(hook.result.current.isSaveAsOpen).toBe(false);

        hook.rerender({
            currentBoard: createBoard({ path: '' }),
            active: true,
        });
        expect(hook.result.current.isSaveAsOpen).toBe(false);
    });

    it('applies a successful direct save without refreshing the file tree', async () => {
        const savedBoard = createBoard({ savedCode: 'saved' });
        jest.spyOn(tazDocumentService, 'saveTazBoard')
            .mockResolvedValue(savedBoard);
        const successToast = jest.spyOn(Toast, 'success');
        const {
            result,
            applySaveResult,
            onSavedBoard,
            onFileSaved,
        } = renderBoardSave();

        let didSave: boolean | undefined;
        await act(async () => {
            didSave = await result.current.save();
        });

        expect(didSave).toBe(true);
        expect(applySaveResult).toHaveBeenCalledWith(savedBoard);
        expect(onSavedBoard).toHaveBeenCalledWith(savedBoard);
        expect(onFileSaved).not.toHaveBeenCalled();
        expect(successToast).toHaveBeenCalledWith(
            'TAZ file saved successfully.',
            { testId: 'tag-analyzer-save-success-toast' },
        );
    });

    it('refreshes after Save As without failing a completed save', async () => {
        const savedBoard = createBoard({
            path: '/reports/',
            name: 'copy.taz',
            savedCode: 'saved',
        });
        const saveSpy = jest.spyOn(tazDocumentService, 'saveTazBoard')
            .mockResolvedValue(savedBoard);
        const errorToast = jest.spyOn(Toast, 'error');
        const hook = renderBoardSave();
        hook.onFileSaved.mockRejectedValue(new Error('refresh failed'));

        let didSave: boolean | undefined;
        await act(async () => {
            didSave = await hook.result.current.saveAs(
                '/reports/',
                'copy.taz',
            );
        });

        expect(didSave).toBe(true);
        expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({
            path: '/reports/',
            name: 'copy.taz',
        }));
        expect(hook.onFileSaved).toHaveBeenCalledWith(
            '/reports/',
            'copy.taz',
        );
        expect(errorToast).toHaveBeenCalledWith(
            'TAZ file saved, but file tree refresh failed.',
        );
    });

    it('does not apply a failed save', async () => {
        jest.spyOn(tazDocumentService, 'saveTazBoard')
            .mockResolvedValue(undefined);
        const errorToast = jest.spyOn(Toast, 'error');
        const hook = renderBoardSave();

        let didSave: boolean | undefined;
        await act(async () => {
            didSave = await hook.result.current.save();
        });

        expect(didSave).toBe(false);
        expect(hook.applySaveResult).not.toHaveBeenCalled();
        expect(hook.onSavedBoard).not.toHaveBeenCalled();
        expect(errorToast).toHaveBeenCalledWith(
            'Failed to save TAZ file. Please try again.',
        );
    });

    it('ignores an older save that completes after a newer request', async () => {
        const older = createDeferred<BoardInfo | undefined>();
        const newer = createDeferred<BoardInfo | undefined>();
        jest.spyOn(tazDocumentService, 'saveTazBoard')
            .mockImplementationOnce(() => older.promise)
            .mockImplementationOnce(() => newer.promise);
        const successToast = jest.spyOn(Toast, 'success');
        const errorToast = jest.spyOn(Toast, 'error');
        const hook = renderBoardSave();

        let olderResult!: Promise<boolean>;
        let newerResult!: Promise<boolean>;
        act(() => {
            olderResult = hook.result.current.save();
            newerResult = hook.result.current.saveAs('/new/', 'new.taz');
        });

        const newerBoard = createBoard({
            path: '/new/',
            name: 'new.taz',
            savedCode: 'newer',
        });
        await act(async () => {
            newer.resolve(newerBoard);
            expect(await newerResult).toBe(true);
        });
        await act(async () => {
            older.resolve(undefined);
            expect(await olderResult).toBe(false);
        });

        expect(hook.applySaveResult).toHaveBeenCalledTimes(1);
        expect(hook.applySaveResult).toHaveBeenCalledWith(newerBoard);
        expect(successToast).toHaveBeenCalledTimes(1);
        expect(errorToast).not.toHaveBeenCalled();
    });

    it('keeps modal controls stable across board rerenders', () => {
        const hook = renderBoardSave();
        const openSaveAs = hook.result.current.openSaveAs;
        const closeSaveAs = hook.result.current.closeSaveAs;

        hook.rerender({ currentBoard: createBoard(), active: true });

        expect(hook.result.current.openSaveAs).toBe(openSaveAs);
        expect(hook.result.current.closeSaveAs).toBe(closeSaveAs);
    });

    it('ignores a save that completes after the board unmounts', async () => {
        const pending = createDeferred<BoardInfo | undefined>();
        jest.spyOn(tazDocumentService, 'saveTazBoard')
            .mockReturnValue(pending.promise);
        const successToast = jest.spyOn(Toast, 'success');
        const hook = renderBoardSave();

        let saveResult!: Promise<boolean>;
        act(() => {
            saveResult = hook.result.current.save();
        });
        hook.unmount();

        await act(async () => {
            pending.resolve(createBoard({ savedCode: 'saved' }));
            expect(await saveResult).toBe(false);
        });

        expect(hook.applySaveResult).not.toHaveBeenCalled();
        expect(hook.onSavedBoard).not.toHaveBeenCalled();
        expect(successToast).not.toHaveBeenCalled();
    });

    it('ignores a save that completes after switching boards', async () => {
        const pending = createDeferred<BoardInfo | undefined>();
        jest.spyOn(tazDocumentService, 'saveTazBoard')
            .mockReturnValue(pending.promise);
        const hook = renderBoardSave();

        let saveResult!: Promise<boolean>;
        act(() => {
            saveResult = hook.result.current.save();
        });
        hook.rerender({
            currentBoard: createBoard({ id: 'board-b' }),
            active: true,
        });

        await act(async () => {
            pending.resolve(createBoard({ savedCode: 'saved' }));
            expect(await saveResult).toBe(false);
        });
        expect(hook.applySaveResult).not.toHaveBeenCalled();
        expect(hook.onSavedBoard).not.toHaveBeenCalled();
    });

    it('handles the save shortcut only while the board is active', async () => {
        const savedBoard = createBoard({ savedCode: 'saved' });
        const saveSpy = jest.spyOn(tazDocumentService, 'saveTazBoard')
            .mockResolvedValue(savedBoard);
        const hook = renderBoardSave();
        const activeEvent = new KeyboardEvent('keydown', {
            key: 's',
            ctrlKey: true,
            cancelable: true,
        });

        act(() => document.dispatchEvent(activeEvent));
        expect(activeEvent.defaultPrevented).toBe(true);
        await waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(1));

        hook.rerender({ currentBoard: createBoard(), active: false });
        const inactiveEvent = new KeyboardEvent('keydown', {
            key: 's',
            metaKey: true,
            cancelable: true,
        });
        act(() => document.dispatchEvent(inactiveEvent));

        expect(inactiveEvent.defaultPrevented).toBe(false);
        expect(saveSpy).toHaveBeenCalledTimes(1);
    });
});
