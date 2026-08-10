import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { fftApi, type FftChartData } from '../api/fftApi';
import type { ChartSeriesData } from '../chart/chartData';
import type { FFTSelectionPayload } from '../panel/panelInteraction';
import type { PanelSeriesDefinition } from '../seriesModel';
import {
    buildSelectionSummaryPayload,
    SelectionSummaryPopover,
} from './AnalysisModals';

jest.mock('../api/fftApi', () => ({
    fftApi: {
        fetchFftChartData: jest.fn(),
    },
}));

jest.mock('@/components/tql/ShowVisualization', () => ({
    ShowVisualization: () => <div data-testid="fft-chart" />,
}));

const SERIES = {
    key: 'series-1',
    sourceTagName: 'temperature',
} as PanelSeriesDefinition;

const SELECTION: FFTSelectionPayload = {
    start: 10,
    end: 20,
    seriesSummaries: [{
        series: SERIES,
        min: '1.00000',
        max: '2.00000',
        avg: '1.50000',
    }],
};

function chartData(data: ChartSeriesData['data']): ChartSeriesData {
    return {
        name: 'temperature',
        data,
        yAxis: 0,
        marker: undefined,
        color: undefined,
    };
}

test('builds selection statistics from values inside the selected range', () => {
    expect(
        buildSelectionSummaryPayload(
            { start: 10, end: 20 },
            [chartData([[5, 100], [10, 2], [15, null], [20, 4], [25, 200]])],
            [SERIES],
        ),
    ).toEqual({
        start: 10,
        end: 20,
        seriesSummaries: [{
            series: SERIES,
            min: '2.00000',
            max: '4.00000',
            avg: '3.00000',
        }],
    });
});

test('returns no payload when the selection contains no values', () => {
    expect(
        buildSelectionSummaryPayload(
            { start: 10, end: 20 },
            [chartData([[5, 1], [15, null]])],
            [SERIES],
        ),
    ).toBeUndefined();
});

test('rejects mismatched chart and panel series', () => {
    expect(() =>
        buildSelectionSummaryPayload(
            { start: 10, end: 20 },
            [],
            [SERIES],
        ),
    ).toThrow('Brush selection series mismatch');
});

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}

describe('FFT interactions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('keeps FFT disabled and nonfunctional outside Raw mode', () => {
        render(
            <SelectionSummaryPopover
                selection={SELECTION}
                position={{ x: 0, y: 0 }}
                isNumericXAxis={false}
                isRaw={false}
                onClose={jest.fn()}
            />,
        );

        const openFftButton = screen.getByRole('button', {
            name: 'Open FFT chart',
        });
        expect(openFftButton).toBeDisabled();
        expect(screen.getByTitle(
            'FFT is only allowed during raw mode',
        )).toBeInTheDocument();

        fireEvent.click(openFftButton);

        expect(fftApi.fetchFftChartData).not.toHaveBeenCalled();
        expect(screen.queryByText('FFT')).not.toBeInTheDocument();
    });

    test('rejects duplicate loads while pending and unlocks after success', async () => {
        const pendingRequest = deferred<FftChartData>();
        jest.mocked(fftApi.fetchFftChartData)
            .mockResolvedValueOnce({ chartID: 'initial-chart' })
            .mockReturnValueOnce(pendingRequest.promise)
            .mockResolvedValueOnce({ chartID: 'retry-chart' });
        render(
            <SelectionSummaryPopover
                selection={SELECTION}
                position={{ x: 0, y: 0 }}
                isNumericXAxis={false}
                isRaw
                onClose={jest.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', {
            name: 'Open FFT chart',
        }));
        const applyButton = await screen.findByRole('button', {
            name: 'Apply values',
        });
        await waitFor(() => {
            expect(fftApi.fetchFftChartData).toHaveBeenCalledTimes(1);
            expect(applyButton).toBeEnabled();
        });

        act(() => {
            applyButton.click();
            applyButton.click();
        });

        await waitFor(() => {
            expect(fftApi.fetchFftChartData).toHaveBeenCalledTimes(2);
        });
        expect(applyButton).toBeDisabled();

        await act(async () => {
            pendingRequest.resolve({ chartID: 'applied-chart' });
            await pendingRequest.promise;
        });
        await waitFor(() => expect(applyButton).toBeEnabled());

        fireEvent.click(applyButton);

        await waitFor(() => {
            expect(fftApi.fetchFftChartData).toHaveBeenCalledTimes(3);
            expect(applyButton).toBeEnabled();
        });
    });

    test('keeps reopening disabled until a closed FFT request finishes', async () => {
        const pendingRequest = deferred<FftChartData>();
        jest.mocked(fftApi.fetchFftChartData)
            .mockResolvedValueOnce({ chartID: 'initial-chart' })
            .mockReturnValueOnce(pendingRequest.promise)
            .mockResolvedValueOnce({ chartID: 'reopened-chart' });
        render(
            <SelectionSummaryPopover
                selection={SELECTION}
                position={{ x: 0, y: 0 }}
                isNumericXAxis={false}
                isRaw
                onClose={jest.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', {
            name: 'Open FFT chart',
        }));
        const applyButton = await screen.findByRole('button', {
            name: 'Apply values',
        });
        await waitFor(() => expect(applyButton).toBeEnabled());
        fireEvent.click(applyButton);
        await waitFor(() => {
            expect(fftApi.fetchFftChartData).toHaveBeenCalledTimes(2);
        });
        const pendingSignal = jest.mocked(fftApi.fetchFftChartData).mock.calls[1][5];

        fireEvent.click(screen.getByRole('button', { name: 'Close' }));

        const reopenButton = screen.getByRole('button', {
            name: 'Open FFT chart',
        });
        expect(reopenButton).toBeDisabled();
        expect(
            screen.getByTitle('Wait for the current FFT request to finish.'),
        ).toBeInTheDocument();
        expect(pendingSignal?.aborted).toBe(false);

        fireEvent.click(reopenButton);
        expect(fftApi.fetchFftChartData).toHaveBeenCalledTimes(2);

        await act(async () => {
            pendingRequest.resolve({ chartID: 'applied-chart' });
            await pendingRequest.promise;
        });
        await waitFor(() => expect(reopenButton).toBeEnabled());

        fireEvent.click(reopenButton);

        await waitFor(() => {
            expect(fftApi.fetchFftChartData).toHaveBeenCalledTimes(3);
        });
    });

    test('aborts the active FFT request when its selection owner unmounts', async () => {
        const pendingRequest = deferred<FftChartData>();
        jest.mocked(fftApi.fetchFftChartData).mockReturnValueOnce(
            pendingRequest.promise,
        );
        const { unmount } = render(
            <SelectionSummaryPopover
                selection={SELECTION}
                position={{ x: 0, y: 0 }}
                isNumericXAxis={false}
                isRaw
                onClose={jest.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', {
            name: 'Open FFT chart',
        }));
        await waitFor(() => {
            expect(fftApi.fetchFftChartData).toHaveBeenCalledTimes(1);
        });
        const requestSignal = jest.mocked(fftApi.fetchFftChartData).mock.calls[0][5];
        expect(requestSignal?.aborted).toBe(false);

        unmount();

        expect(requestSignal?.aborted).toBe(true);
    });
});
