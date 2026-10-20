import { DEFAULT_PANEL_SERIES_SOURCE_COLUMNS } from '../seriesModel';
import type { ResolvedRangeState } from '../panel/rangeControl/rangeControlModel';
import { act, renderHook } from '@testing-library/react';
import { Toast } from '@/design-system/components';
import { createNewPanelInfo } from '../panel/panelModel';

import { createPanelSeriesDefinition, MIXED_X_AXIS_KIND_WARNING, PanelSeriesCalculationMode } from '../seriesModel';
import { useBoardOverlapSelection } from './useBoardOverlapSelection';

const RANGE: ResolvedRangeState = {
    range: {
        mainRange: { start: 10, end: 20 },
        navigatorRange: { start: 0, end: 30 },
    },
    fullRange: { start: 0, end: 30 },
    navigatorRangeInput: { start: '', end: '' },
};

function createPanel(key = 'panel-a', numeric = false) {
    const panel = createNewPanelInfo([
        createPanelSeriesDefinition({
            key: 'series-a',
            table: 'DATA',
            tagName: 'TAG',
            calculationMode: PanelSeriesCalculationMode.Average,
            columns: numeric
                ? { ...DEFAULT_PANEL_SERIES_SOURCE_COLUMNS, timeBaseTime: true }
                : DEFAULT_PANEL_SERIES_SOURCE_COLUMNS,
        }),
    ], 'Comparison', 'Line');
    return { ...panel, key, isOverlapSelected: true };
}

describe('overlap selection compatibility', () => {
    it.each([false, true])('hands selected snapshots to the overlap dialog (numeric=%s)', (numeric) => {
        const panel = createPanel('selected', numeric);
        panel.axes.leftY.zeroBase = true;
        const { result } = renderHook(() => useBoardOverlapSelection([panel], { selected: RANGE }, jest.fn()));
        act(() => result.current.openOverlapChart());
        expect(result.current.openSession).toEqual({
            panels: [{ key: panel.key, title: panel.title, visibleRange: RANGE.range.mainRange,
                query: expect.objectContaining({ seriesList: panel.query.tagSet, range: RANGE.range.mainRange }),
            }],
            isNumericXAxis: numeric,
            includeZeroInYAxisRange: true,
        });
    });

    it('excludes empty, unloaded, and unselected panels from compatibility', () => {
        const selected = createPanel();
        const empty = createPanel('empty');
        empty.query.tagSet = [];
        const unloaded = createPanel('unloaded', true);
        const unselected = { ...createPanel('unselected', true), isOverlapSelected: false };
        const onSelectionChange = jest.fn();
        const { result } = renderHook(() => useBoardOverlapSelection(
            [selected, empty, unloaded, unselected],
            { 'panel-a': RANGE, empty: RANGE, unselected: RANGE },
            onSelectionChange,
        ));

        expect(result.current.canOpenOverlapChart).toBe(true);
        expect(result.current.compatibilityMessage).toBeUndefined();
        expect(onSelectionChange.mock.calls).toEqual([['empty', false], ['unloaded', false]]);
        act(() => result.current.openOverlapChart());
        expect(result.current.openSession?.panels.map((panel) => panel.key)).toEqual(['panel-a']);
    });

    it('requires a selected loaded panel before opening overlap', () => {
        const { result } = renderHook(() => useBoardOverlapSelection([], {}, jest.fn()));

        expect(result.current.canOpenOverlapChart).toBe(false);
        expect(result.current.compatibilityMessage).toBeUndefined();
        act(() => result.current.openOverlapChart());
        expect(result.current.openSession).toBeUndefined();
    });

    it.each([false, true])('preserves mixed-panel warning precedence (mixed=%s)', (includeMixed) => {
        const time = createPanel('time');
        const numeric = createPanel('numeric', true);
        const mixed = createPanel('mixed');
        mixed.query.tagSet.push(numeric.query.tagSet[0]);
        const panels = includeMixed ? [time, numeric, mixed] : [time, numeric];
        const { result } = renderHook(() => useBoardOverlapSelection(
            panels, { time: RANGE, numeric: RANGE, mixed: RANGE }, jest.fn(),
        ));

        expect(result.current.canOpenOverlapChart).toBe(false);
        expect(result.current.compatibilityMessage).toBe(includeMixed
            ? `${MIXED_X_AXIS_KIND_WARNING} Overlap is disabled.`
            : 'Overlap can only compare panels with the same x-axis type.');
    });

    it('keeps distinct warnings for empty and mixed-axis toggle candidates', () => {
        const empty = { ...createPanel('empty'), isOverlapSelected: false };
        empty.query.tagSet = [];
        const mixed = { ...createPanel('mixed'), isOverlapSelected: false };
        mixed.query.tagSet.push(createPanel('numeric', true).query.tagSet[0]);
        const warning = jest.spyOn(Toast, 'warning').mockImplementation(() => undefined);
        const onSelectionChange = jest.fn();
        try {
            const { result } = renderHook(() => useBoardOverlapSelection(
                [empty, mixed], { empty: RANGE, mixed: RANGE }, onSelectionChange,
            ));

            act(() => result.current.togglePanelOverlap('empty'));
            act(() => result.current.togglePanelOverlap('mixed'));

            expect(warning.mock.calls).toEqual([
                ['Overlap requires a panel with one x-axis type.', undefined],
                [`${MIXED_X_AXIS_KIND_WARNING} Overlap is disabled for this panel.`, undefined],
            ]);
            expect(onSelectionChange).not.toHaveBeenCalled();
        } finally {
            warning.mockRestore();
        }
    });
});
