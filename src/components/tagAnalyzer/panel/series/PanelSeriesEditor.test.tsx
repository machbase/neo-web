import {
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { tableMetadataApi } from '../../api/tableMetadataApi';
import {
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
} from '../../seriesModel';
import { PanelSeriesEditor } from './PanelSeriesEditor';

const SERIES: PanelSeriesDefinition = {
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
const NUMERIC_SERIES: PanelSeriesDefinition = {
    ...SERIES,
    key: 'numeric-series',
    sourceColumns: {
        ...SERIES.sourceColumns,
        timeBaseTime: true,
        timeType: 4,
    },
};

describe('PanelSeriesEditor', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('updates a selected series calculation mode', async () => {
        jest.spyOn(tableMetadataApi, 'fetchTableNames').mockResolvedValue([]);
        const onSeriesListChange = jest.fn();

        render(
            <PanelSeriesEditor
                seriesList={[SERIES]}
                rollupTableList={{}}
                lockedAxisKind="time"
                onFooterMessageChange={jest.fn()}
                onSeriesListChange={onSeriesListChange}
            />,
        );

        expect(screen.getByLabelText('Table')).toHaveRole('combobox');
        await waitFor(() =>
            expect(tableMetadataApi.fetchTableNames).toHaveBeenCalledTimes(1),
        );
        fireEvent.click(screen.getByRole('button', { name: 'AVG' }));
        fireEvent.click(screen.getByRole('option', { name: 'SUM' }));

        expect(onSeriesListChange).toHaveBeenCalledWith([
            {
                ...SERIES,
                calculationMode: PanelSeriesCalculationMode.Sum,
            },
        ]);
    });

    it('allows clearing a locked list but blocks selecting another x-axis kind', async () => {
        jest.spyOn(tableMetadataApi, 'fetchTableNames').mockResolvedValue([]);
        const onFooterMessageChange = jest.fn();
        const onSeriesListChange = jest.fn();

        const view = render(
            <PanelSeriesEditor
                seriesList={[SERIES]}
                rollupTableList={{}}
                lockedAxisKind="time"
                onFooterMessageChange={onFooterMessageChange}
                onSeriesListChange={onSeriesListChange}
            />,
        );

        await waitFor(() =>
            expect(tableMetadataApi.fetchTableNames).toHaveBeenCalledTimes(1),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
        expect(onSeriesListChange).toHaveBeenCalledWith([]);

        view.rerender(
            <PanelSeriesEditor
                seriesList={[NUMERIC_SERIES]}
                rollupTableList={{}}
                lockedAxisKind="time"
                onFooterMessageChange={onFooterMessageChange}
                onSeriesListChange={onSeriesListChange}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'AVG' }));
        fireEvent.click(screen.getByRole('option', { name: 'SUM' }));

        expect(onSeriesListChange).toHaveBeenCalledTimes(1);
        expect(onFooterMessageChange).toHaveBeenLastCalledWith(
            'The panel x-axis type cannot be changed.',
        );
    });
});
