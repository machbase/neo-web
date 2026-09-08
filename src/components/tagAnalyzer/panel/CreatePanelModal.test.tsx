import { fireEvent, render, screen } from '@testing-library/react';
import { PanelSeriesCalculationMode } from '../seriesModel';
import { CreatePanelModal } from './CreatePanelModal';

const MOCK_SERIES = {
    key: 'series-1',
    table: 'TAG',
    sourceTagName: 'TAG_A',
    alias: 'Tag A',
    calculationMode: PanelSeriesCalculationMode.Average,
    useSecondaryAxis: false,
    id: undefined,
    useRollupTable: false,
    sourceColumns: {
        name: 'NAME',
        time: 'TIME',
        value: 'VALUE',
        timeBaseTime: false,
    },
};

jest.mock('./series/PanelSeriesEditor', () => ({
    PanelSeriesEditor: ({
        onSeriesListChange,
    }: {
        onSeriesListChange: (seriesList: typeof MOCK_SERIES[]) => void;
    }) => (
        <button
            type="button"
            onClick={() => onSeriesListChange([MOCK_SERIES])}
        >
            Select test series
        </button>
    ),
}));

describe('CreatePanelModal', () => {
    it('creates the configured panel and closes the modal', () => {
        const onClose = jest.fn();
        const onCreatePanel = jest.fn();

        render(
            <CreatePanelModal
                rollupTableList={{}}
                onClose={onClose}
                onCreatePanel={onCreatePanel}
            />,
        );

        const applyButton = screen.getByRole('button', { name: 'Apply' });
        expect(applyButton).toBeDisabled();

        fireEvent.change(screen.getByLabelText('Chart name'), {
            target: { value: 'Created panel' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Scatter' }));
        fireEvent.click(
            screen.getByRole('button', { name: 'Select test series' }),
        );
        expect(applyButton).toBeEnabled();
        fireEvent.click(applyButton);

        expect(onCreatePanel).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Created panel',
                query: expect.objectContaining({ tagSet: [MOCK_SERIES] }),
                display: expect.objectContaining({ chartType: 'Dot' }),
            }),
        );
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
