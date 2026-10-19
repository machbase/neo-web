import { act, renderHook, waitFor } from '@testing-library/react';
import { DEFAULT_PANEL_SERIES_SOURCE_COLUMNS, createPanelSeriesDefinition, PanelSeriesCalculationMode } from '../seriesModel';
import { createNewPanelInfo, type PanelInfo } from '../panel/panelModel';
import { seriesDataApi } from '../api/seriesDataApi';
import { useOverlapData } from './useOverlapData';
import { useBoardOverlapSelection } from '../board/useBoardOverlapSelection';

jest.mock('@/design-system/components', () => ({ Toast: { error: jest.fn() } }));

function renderOverlap(panel: PanelInfo) {
    const { result: selection } = renderHook(() => useBoardOverlapSelection(
        [{ ...panel, isOverlapSelected: true }],
        { [panel.key]: { range: { mainRange: visibleRange, navigatorRange: visibleRange }, fullRange: visibleRange, navigatorRangeInput: { start: '', end: '' } } },
        jest.fn(),
    ));
    act(() => selection.current.openOverlapChart());
    const session = selection.current.openSession;
    if (!session) throw new Error('Expected overlap session to open.');
    return renderHook(() => useOverlapData(session.panels));
}

const visibleRange = { start: 10, end: 20 };
function createPanel() {
    return createNewPanelInfo([createPanelSeriesDefinition({
        key: 'series-a', table: 'DATA', tagName: 'TAG',
        calculationMode: PanelSeriesCalculationMode.Average,
        columns: DEFAULT_PANEL_SERIES_SOURCE_COLUMNS,
    })], 'Comparison', 'Line');
}

afterEach(() => jest.restoreAllMocks());

it.each([false, true])('preserves raw sampling=%s and ordering in the overlap request', async (sampled) => {
    const panelInfo = createPanel();
    panelInfo.mode = { ...panelInfo.mode, isRaw: true, isOrderBy: true };
    panelInfo.display.mainChartSampling = { enabled: sampled, sampleCount: 75 };
    const fetch = jest.spyOn(seriesDataApi, 'fetchSeriesRows').mockResolvedValue([]);
    const { result } = renderOverlap(panelInfo);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetch).toHaveBeenCalledWith({
        kind: sampled ? 'sampled-raw' : 'raw', range: visibleRange,
        seriesList: panelInfo.query.tagSet, useOrderBy: true,
        ...(sampled && { sampleCount: 75 }),
    }, { signal: expect.any(AbortSignal) });
});

it('prepares numeric calculated queries', async () => {
    const panelInfo = createPanel();
    panelInfo.query.tagSet[0].sourceColumns.timeBaseTime = true;
    panelInfo.display.pixelsPerTick.calculated = 10;
    const fetch = jest.spyOn(seriesDataApi, 'fetchSeriesRows').mockResolvedValue([]);
    const { result } = renderOverlap(panelInfo);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetch).toHaveBeenCalledWith(expect.objectContaining({
        kind: 'calculated', seriesList: panelInfo.query.tagSet, range: visibleRange,
        rowLimit: 100, numericBucketWidth: expect.any(Number), rollupTables: {},
    }), { signal: expect.any(AbortSignal) });
});

it('keeps invalid settings in the dialog error flow', async () => {
    const panelInfo = createPanel();
    panelInfo.mode.isRaw = true;
    panelInfo.display.mainChartSampling = { enabled: true, sampleCount: 0 };
    const fetch = jest.spyOn(seriesDataApi, 'fetchSeriesRows');
    const { result } = renderOverlap(panelInfo);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.loadError).toBe('Raw panel sampling requires a positive sample count.');
    expect(fetch).not.toHaveBeenCalled();
});
