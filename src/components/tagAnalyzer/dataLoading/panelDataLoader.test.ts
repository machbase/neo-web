import { act, renderHook, waitFor } from '@testing-library/react';
import { Toast } from '@/design-system/components';
import { seriesDataApi } from '../api/seriesDataApi';
import type { PanelDataFetchResult } from '../api/seriesDataApi';
import {
    createNewPanelInfo,
} from '../panel/panelModel';
import {
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
} from '../seriesModel';
import type { AxisRange, ResolvedRangeState } from '../range/rangeModel';
import { fetchMainSeriesRows, usePanelDataLoading } from './panelDataLoader';

const NUMERIC_SERIES: PanelSeriesDefinition = {
    key: 'series-1',
    table: 'ADMIN.METRICS',
    sourceTagName: 'speed',
    alias: 'Speed',
    calculationMode: PanelSeriesCalculationMode.Average,
    useSecondaryAxis: false,
    id: undefined,
    useRollupTable: false,
    sourceColumns: {
        name: 'NAME',
        time: 'TIME',
        value: 'VALUE',
        timeBaseTime: true,
    },
};

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}

function createLimitedRawResult(range: AxisRange): PanelDataFetchResult {
    return [{
        seriesKey: NUMERIC_SERIES.key,
        data: [
            [range.start, 1],
            [range.end, 2],
        ],
        metadata: { kind: 'raw', isLimitReached: true },
    }];
}

describe('fetchMainSeriesRows', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('uses the fixed main limit without changing numeric bucket width', async () => {
        const fetchCalculatedSeriesRows = jest
            .spyOn(seriesDataApi, 'fetchCalculatedSeriesRows')
            .mockResolvedValue([]);
        const panelInfo = createNewPanelInfo(
            [NUMERIC_SERIES],
            'Numeric panel',
            'Line',
        );

        await fetchMainSeriesRows(
            panelInfo,
            { start: 0, end: 100_000 },
            400,
            {},
            { numericBucketWidth: 100 },
        );

        const call = fetchCalculatedSeriesRows.mock.calls[0];
        expect(call[3]).toBe(10_000);
        expect(call[5]?.numericBucketWidth).toBe(100);
    });

    it('derives numeric bucket width when the caller does not supply one', async () => {
        const fetchCalculatedSeriesRows = jest
            .spyOn(seriesDataApi, 'fetchCalculatedSeriesRows')
            .mockResolvedValue([]);
        const panelInfo = createNewPanelInfo(
            [NUMERIC_SERIES],
            'Numeric panel',
            'Line',
        );

        await fetchMainSeriesRows(
            panelInfo,
            { start: 0, end: 500_000 },
            400,
            {},
        );

        const call = fetchCalculatedSeriesRows.mock.calls[0];
        expect(call[3]).toBe(10_000);
        expect(call[5]?.numericBucketWidth).toBe(500);
    });
});

describe('usePanelDataLoading', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('does not let a stale limited raw result mask a wider requested range', async () => {
        const initialRange: AxisRange = { start: 0, end: 100 };
        const initialFetchedRange: AxisRange = {
            start: 20,
            end: 80,
        };
        const widerRange: AxisRange = { start: 0, end: 1_000 };
        const widerFetchedRange: AxisRange = {
            start: 100,
            end: 900,
        };
        const freshRawResult = deferred<PanelDataFetchResult | undefined>();
        const fetchRawSeriesRows = jest
            .spyOn(seriesDataApi, 'fetchRawSeriesRows')
            .mockResolvedValueOnce(createLimitedRawResult(initialFetchedRange))
            .mockReturnValueOnce(freshRawResult.promise);
        jest.spyOn(seriesDataApi, 'fetchCalculatedSeriesRows')
            .mockResolvedValue([]);
        jest.spyOn(Toast, 'warning').mockImplementation(() => undefined);
        const panelInfo = createNewPanelInfo(
            [NUMERIC_SERIES],
            'Raw panel',
            'Line',
        );
        panelInfo.mode.isRaw = true;
        const onRawMainRangeLimited = jest.fn();
        const createRangeState = (
            range: AxisRange,
        ): ResolvedRangeState => ({
            range: {
                mainRange: range,
                navigatorRange: range,
            },
            fullRange: widerRange,
            navigatorRangeInput: { start: '', end: '' },
        });
        const { result, rerender } = renderHook(
            ({ rangeState }) => usePanelDataLoading({
                panelInfo,
                isActive: true,
                rangeState,
                chartAreaWidth: 800,
                rollupTableList: {},
                dataRefreshVersion: 0,
                onRawMainRangeLimited,
            }),
            { initialProps: { rangeState: createRangeState(initialRange) } },
        );
        await waitFor(() =>
            expect(result.current.loadStatus.chart).toBe('ready'),
        );
        expect(result.current.renderRange?.mainRange).toEqual(
            initialFetchedRange,
        );
        onRawMainRangeLimited.mockClear();

        rerender({ rangeState: createRangeState(widerRange) });

        expect(fetchRawSeriesRows).toHaveBeenCalledTimes(2);
        expect(result.current.renderRange?.mainRange).toEqual(widerRange);
        expect(onRawMainRangeLimited).not.toHaveBeenCalled();

        await act(async () => {
            freshRawResult.resolve(createLimitedRawResult(widerFetchedRange));
            await freshRawResult.promise;
        });

        await waitFor(() =>
            expect(onRawMainRangeLimited).toHaveBeenCalledWith(
                widerFetchedRange,
            ),
        );
    });
});
