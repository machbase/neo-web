import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FFTModal } from './FFTModal';
import { getTqlChart } from '@/api/repository/machiot';

jest.mock('@/api/repository/machiot', () => ({
    getTqlChart: jest.fn(),
}));

jest.mock('../tql/ShowVisualization', () => ({
    ShowVisualization: () => <div data-testid="chart" />,
}));

const mockedGetTqlChart = getTqlChart as jest.MockedFunction<typeof getTqlChart>;

describe('FFTModal', () => {
    beforeEach(() => {
        mockedGetTqlChart.mockResolvedValue({
            status: 200,
            headers: { 'x-chart-type': 'echarts' },
            data: { chartID: 'chart-id' },
        } as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('adds list mapping steps before rendering the 3D FFT chart', async () => {
        render(
            <FFTModal
                pInfo={[
                    {
                        table: 'FFT',
                        name: 'vib-x2',
                        alias: 'vib-x2',
                        min: '0',
                        max: '80',
                        avg: '0',
                    },
                ]}
                pStartTime={1712000000000}
                pEndTime={1712000010000}
                setIsOpen={jest.fn()}
                pTagColInfo={[
                    {
                        colName: {
                            time: 'TIME',
                            value: 'VALUE',
                            name: 'NAME',
                        },
                    },
                ]}
            />
        );

        await waitFor(() => expect(mockedGetTqlChart).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByRole('button', { name: 'Toggle FFT chart dimension' }));
        fireEvent.click(screen.getByRole('button', { name: 'Run FFT chart' }));

        await waitFor(() => expect(mockedGetTqlChart).toHaveBeenCalledTimes(2));
        const tql = mockedGetTqlChart.mock.calls[1][0];

        expect(tql).toContain(
            "PUSHKEY('fft')\nMAPVALUE(0, list(value(0), value(1), value(2)))\nPOPVALUE(1, 2)\nCHART("
        );
    });

    it('uses the selected interval unit in the 3D FFT roundTime expression', async () => {
        render(
            <FFTModal
                pInfo={[
                    {
                        table: 'FFT',
                        name: 'vib-x2',
                        alias: 'vib-x2',
                        min: '0',
                        max: '80',
                        avg: '0',
                    },
                ]}
                pStartTime={1712000000000}
                pEndTime={1712000010000}
                setIsOpen={jest.fn()}
                pTagColInfo={[
                    {
                        colName: {
                            time: 'TIME',
                            value: 'VALUE',
                            name: 'NAME',
                        },
                    },
                ]}
            />
        );

        await waitFor(() => expect(mockedGetTqlChart).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByRole('button', { name: 'Toggle FFT chart dimension' }));

        fireEvent.change(screen.getByLabelText('Interval'), { target: { value: '1' } });

        const unitButton = screen.getByText('ms').closest('button');
        expect(unitButton).not.toBeNull();
        fireEvent.click(unitButton as HTMLButtonElement);
        fireEvent.click(screen.getByRole('option', { name: 'sec' }));

        fireEvent.click(screen.getByRole('button', { name: 'Run FFT chart' }));

        await waitFor(() => expect(mockedGetTqlChart).toHaveBeenCalledTimes(2));
        const tql = mockedGetTqlChart.mock.calls[1][0];

        expect(tql).toContain("MAPKEY( roundTime(value(0), '1s') )");
    });
});
