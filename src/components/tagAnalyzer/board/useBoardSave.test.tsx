import { act, renderHook, waitFor } from '@testing-library/react';
import { Toast } from '@/design-system/components';
import type { BoardInfo } from './boardModel';
import * as boardSave from '@/utils/boardFileSave';
import * as boardSnapshot from '../persistence/tazBoardSnapshot';
import { useBoardSave } from './useBoardSave';
import { UncertainFileWriteError } from '@/api/repository/fileWriteQueue';
import { createTagAnalyzerBoardFromPayload } from '../application/adapters';

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
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
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

// Drive the common save boundary. Its real repository/queue contract is tested
// in boardFileSave.test.ts; this suite checks the hook's live editor response.
function spyOnSave() {
    const write = jest.fn();
    jest.spyOn(boardSave, 'saveBoardFile').mockImplementation(async options => {
        try {
            const saved = await write(options.board);
            if (saved) options.onSuccess(saved, {isSaving: () => false, isLatestAction: options.canApply?.() !== false});
            return !!saved;
        } catch (error) {
            if (error instanceof UncertainFileWriteError) options.onUncertain();
            throw error;
        }
    });
    return write;
}

beforeEach(() => {
    jest.spyOn(boardSnapshot, 'isTazBoardSaved').mockReturnValue(false);
});

afterEach(() => {
    jest.restoreAllMocks();
});

it.each([false, true])('observed ambiguous file only acknowledges its baseline, source unmounted=%s', async unmounted => {
    const board = createBoard({ boardTimeRange: { start: 'now-3h', end: 'now' } });
    const observed = createBoard({ id: 'read-snapshot', savedCode: 'OBSERVED', boardTimeRange: { start: 'now-1h', end: 'now' } });
    const pending = createDeferred<boolean>();
    let options!: Parameters<typeof boardSave.saveBoardFile>[0];
    jest.spyOn(boardSave, 'saveBoardFile').mockImplementation(async value => { options = value; return pending.promise; });
    const hook = renderBoardSave(board);
    let saving!: Promise<boolean>;
    act(() => { saving = hook.result.current.save(); });
    if (unmounted) hook.unmount();
    await act(async () => { options.onRead?.(observed); pending.resolve(false); await saving; });
    expect(hook.onSavedBoard).toHaveBeenCalledWith(observed, { overwritten: false, acknowledgementOnly: true });
    if (unmounted) expect(hook.applySaveResult).not.toHaveBeenCalled();
    else expect(hook.applySaveResult).toHaveBeenCalledWith(expect.objectContaining({ id: board.id, boardTimeRange: board.boardTimeRange, savedCode: observed.savedCode }));
});

describe('useBoardSave', () => {
    it.each(['button', 'ctrl+s', 'meta+s'])('opens Save As for a new Data Viewer board via %s without writing a file', async (trigger) => {
        const result = createTagAnalyzerBoardFromPayload({
            title: 'Selected Tags',
            tags: [{
                tagName: 'MEMORY',
                table: 'TAG_TEST',
                colName: { name: 'NAME', time: 'TIME', value: 'VALUE', timeType: 6, timeBaseTime: true },
            }],
        });
        if (result.status !== 'ok') throw new Error(result.reason);
        const saveSpy = spyOnSave();
        const hook = renderBoardSave(result.board);

        await act(async () => {
            if (trigger === 'button') {
                expect(await hook.result.current.save()).toBe(false);
            } else {
                document.dispatchEvent(new KeyboardEvent('keydown', {
                    key: 's', ctrlKey: trigger === 'ctrl+s', metaKey: trigger === 'meta+s', cancelable: true,
                }));
            }
        });

        expect(hook.result.current.isSaveAsOpen).toBe(true);
        expect(saveSpy).not.toHaveBeenCalled();
        expect(hook.applySaveResult).not.toHaveBeenCalled();
        expect(hook.onSavedBoard).not.toHaveBeenCalled();
    });

    it('opens Save As instead of persisting a pathless board', async () => {
        const saveSpy = spyOnSave();
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

    it('directly saves an existing root file without opening Save As or refreshing the file tree', async () => {
        const existingBoard = createBoard({ name: 'Selected Tags.taz', savedCode: 'previous snapshot' });
        const savedBoard = { ...existingBoard, savedCode: 'saved' };
        const saveSpy = spyOnSave()
            .mockResolvedValue(savedBoard);
        const successToast = jest.spyOn(Toast, 'success');
        const {
            result,
            applySaveResult,
            onSavedBoard,
            onFileSaved,
        } = renderBoardSave(existingBoard);

        let didSave: boolean | undefined;
        await act(async () => {
            didSave = await result.current.save();
        });

        expect(didSave).toBe(true);
        expect(result.current.isSaveAsOpen).toBe(false);
        expect(saveSpy).toHaveBeenCalledWith(existingBoard);
        expect(applySaveResult).toHaveBeenCalledWith(savedBoard);
        expect(onSavedBoard).toHaveBeenCalledWith(savedBoard, expect.objectContaining({ overwritten: false, isSaving: expect.any(Function) }));
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
        const saveSpy = spyOnSave()
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
            expect.any(Function),
        );
        expect(errorToast).toHaveBeenCalledWith(
            'TAZ file saved, but file tree refresh failed.',
        );
    });

    it('does not apply a failed save', async () => {
        spyOnSave()
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
        spyOnSave()
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

    it('acknowledges the file without updating a board that unmounted', async () => {
        const pending = createDeferred<BoardInfo | undefined>();
        spyOnSave()
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
        expect(hook.onSavedBoard).toHaveBeenCalledWith(expect.objectContaining({savedCode:'saved'}), {overwritten:false,acknowledgementOnly:true});
        expect(successToast).not.toHaveBeenCalled();
    });

    it('acknowledges the old file without updating a switched board', async () => {
        const pending = createDeferred<BoardInfo | undefined>();
        spyOnSave()
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
        expect(hook.onSavedBoard).toHaveBeenCalledWith(expect.objectContaining({savedCode:'saved'}), {overwritten:false,acknowledgementOnly:true});
    });

    it('handles the save shortcut only while the board is active', async () => {
        const savedBoard = createBoard({ savedCode: 'saved' });
        const saveSpy = spyOnSave()
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


it('acknowledges the first successful same-file save even when both later saves fail', async () => {
    const first = createDeferred<BoardInfo | undefined>();
    const second = createDeferred<BoardInfo | undefined>();
    const third = createDeferred<BoardInfo | undefined>();
    spyOnSave().mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise).mockImplementationOnce(() => third.promise);
    const board = createBoard({ boardTimeRange: { start: 'now-2h', end: 'now' } });
    const hook = renderBoardSave(board);
    let p1!: Promise<boolean>, p2!: Promise<boolean>, p3!: Promise<boolean>;
    act(() => { p1 = hook.result.current.save(); });
    hook.rerender({currentBoard: {...board, boardTimeRange: {start: 'now-3h', end: 'now'}}, active: true});
    act(() => { p2 = hook.result.current.save(); });
    hook.rerender({currentBoard: {...board, boardTimeRange: {start: 'now-1h', end: 'now'}}, active: true});
    act(() => { p3 = hook.result.current.save(); });
    const saved = {...board, savedCode: 'first snapshot'};
    await act(async () => { first.resolve(saved); await p1; second.resolve(undefined); await p2; third.resolve(undefined); await p3; });
    expect(hook.applySaveResult).toHaveBeenCalledWith(expect.objectContaining({savedCode: 'first snapshot', boardTimeRange: {start: 'now-1h', end: 'now'}}));
    expect(hook.onSavedBoard).toHaveBeenCalledWith({...saved, boardTimeRange: {start: 'now-1h', end: 'now'}}, {overwritten: false, acknowledgementOnly: true});
});


it('keeps later TAZ edits and invalidates only the file whose response was lost', async () => {
    const pending = createDeferred<BoardInfo | undefined>();
    spyOnSave().mockReturnValue(pending.promise);
    const first = createBoard({ boardTimeRange: {start: 'now-2h', end: 'now'} });
    const hook = renderBoardSave(first);
    let saved!: Promise<boolean>;
    act(() => { saved = hook.result.current.save(); });
    const later = {...first, boardTimeRange: {start: 'now-4h', end: 'now'}};
    hook.rerender({currentBoard: later, active: true});
    await act(async () => {
        pending.reject(new UncertainFileWriteError(new Error('response lost')));
        expect(await saved).toBe(false);
    });
    expect(hook.applySaveResult).toHaveBeenCalledWith({...later, savedCode: false});
    expect(hook.onSavedBoard).toHaveBeenCalledWith({...later, savedCode: false}, {overwritten: false, acknowledgementOnly: true});
});
