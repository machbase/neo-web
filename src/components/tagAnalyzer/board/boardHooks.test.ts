import { act, renderHook } from '@testing-library/react';
import { createNewPanelInfo, type PanelInfo } from '../panel/panelModel';
import type { ResolvedRangeState } from '../range/rangeModel';
import {
    createPanelSeriesDefinition,
    DEFAULT_PANEL_SERIES_SOURCE_COLUMNS,
    PanelSeriesCalculationMode,
} from '../seriesModel';
import type { BoardInfo } from './boardModel';
import { useBoardOverlapSelection } from './useBoardOverlapSelection';
import { useBoardState } from './useBoardState';

const PANEL_RANGE_STATE: ResolvedRangeState = {
    range: {
        mainRange: { start: 10, end: 20 },
        navigatorRange: { start: 0, end: 30 },
    },
    fullRange: { start: 0, end: 30 },
    navigatorRangeInput: { start: '', end: '' },
};

function createPanel(key = 'panel-a'): PanelInfo {
    return {
        ...createNewPanelInfo([], 'Panel', 'Line'),
        key,
        time: {
            rangeInput: { start: '', end: '' },
            useLastViewedRange: true,
            lastViewedRange: undefined,
        },
    };
}

function createBoard(panel = createPanel()): BoardInfo {
    return {
        id: 'board-a',
        type: 'taz',
        name: 'Board',
        path: '',
        code: '',
        panels: [panel],
        boardTimeRange: { start: 'first', end: 'last' },
        boardNumericRange: { start: '', end: '' },
        savedCode: false,
    };
}

describe('board runtime hooks', () => {
    it('keeps runtime panels and ranges when saved metadata arrives', () => {
        const board = createBoard();
        const { result } = renderHook(() => useBoardState(board));

        act(() => {
            result.current.commands.applyPanelInfo({
                ...board.panels[0],
                title: 'Runtime title',
            });
            result.current.commands.setPanelRange(
                'panel-a',
                PANEL_RANGE_STATE,
            );
        });
        act(() => {
            result.current.commands.applySaveResult({
                ...board,
                name: 'Saved board',
                path: '/saved',
                panels: [],
                boardTimeRange: { start: 'stale', end: 'stale' },
                savedCode: 'saved-code',
            });
        });

        expect(result.current.state.info).toMatchObject({
            name: 'Saved board',
            path: '/saved',
            savedCode: 'saved-code',
            boardTimeRange: board.boardTimeRange,
            panels: [{ key: 'panel-a', title: 'Runtime title' }],
        });
        expect(result.current.state.panelRanges['panel-a']).toBe(
            PANEL_RANGE_STATE,
        );
        expect(
            result.current.infoForSave.panels[0].time.lastViewedRange,
        ).toEqual(PANEL_RANGE_STATE.range);
    });

    it('opens overlap from the selected panel and its resolved range', () => {
        const panel = {
            ...createPanel(),
            isOverlapSelected: true,
            query: {
                tagSet: [
                    createPanelSeriesDefinition({
                        key: 'series-a',
                        table: 'DATA',
                        tagName: 'TAG',
                        calculationMode: PanelSeriesCalculationMode.Average,
                        columns: DEFAULT_PANEL_SERIES_SOURCE_COLUMNS,
                    }),
                ],
                intervalType: undefined,
            },
        };
        const onSelectionChange = jest.fn();
        const { result } = renderHook(() =>
            useBoardOverlapSelection(
                [panel],
                { 'panel-a': PANEL_RANGE_STATE },
                onSelectionChange,
            ),
        );

        expect(result.current.canOpenOverlapChart).toBe(true);
        act(() => result.current.openOverlapChart());
        expect(result.current.openSession).toMatchObject({
            panels: [{
                panelInfo: { key: 'panel-a' },
                visibleRange: PANEL_RANGE_STATE.range.mainRange,
            }],
            isNumericXAxis: false,
        });
        expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it('keeps commands stable and applies queued panel changes in order', () => {
        const board = createBoard();
        const { result, rerender } = renderHook(() => useBoardState(board));
        const commands = result.current.commands;
        const appendedPanel = createPanel('panel-b');

        act(() => {
            commands.setBoardRange('numeric', { start: '1', end: '2' });
            commands.appendPanel(appendedPanel);
            commands.setPanelOverlapSelected('panel-b', true);
            commands.setPanelRange('panel-b', PANEL_RANGE_STATE);
        });

        expect(result.current.state.info.boardNumericRange).toEqual({
            start: '1',
            end: '2',
        });
        expect(result.current.state.info.panels[1]).toMatchObject({
            key: 'panel-b',
            isOverlapSelected: true,
        });
        expect(result.current.state.panelRanges['panel-b']).toBe(
            PANEL_RANGE_STATE,
        );

        rerender();
        expect(result.current.commands).toBe(commands);

        act(() => commands.removePanel('panel-a'));
        expect(result.current.state.info.panels).toHaveLength(1);
        expect(result.current.state.info.panels[0].key).toBe('panel-b');
        expect(result.current.state.panelRanges).toEqual({
            'panel-b': PANEL_RANGE_STATE,
        });
    });

    it('reconciles incoming boards without leaking runtime state across IDs', () => {
        const board = { ...createBoard(), savedCode: 'saved-a' };
        const { result, rerender } = renderHook(
            ({ boardInfo }) => useBoardState(boardInfo),
            { initialProps: { boardInfo: board } },
        );

        act(() => {
            result.current.commands.setPanelOverlapSelected('panel-a', true);
            result.current.commands.setPanelRange(
                'panel-a',
                PANEL_RANGE_STATE,
            );
        });

        rerender({
            boardInfo: {
                ...board,
                savedCode: 'saved-b',
                panels: [{ ...board.panels[0], title: 'Incoming title' }],
            },
        });
        expect(result.current.state.info.panels[0]).toMatchObject({
            title: 'Incoming title',
            isOverlapSelected: true,
        });
        expect(result.current.state.panelRanges['panel-a']).toBe(
            PANEL_RANGE_STATE,
        );

        rerender({
            boardInfo: {
                ...createBoard(),
                id: 'board-b',
                savedCode: 'saved-c',
            },
        });
        expect(result.current.state.info.id).toBe('board-b');
        expect(result.current.state.info.panels[0].isOverlapSelected).toBe(
            false,
        );
        expect(result.current.state.panelRanges['panel-a']).toBeUndefined();
    });
});
