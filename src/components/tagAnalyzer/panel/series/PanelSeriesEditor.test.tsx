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
                onFooterMessageChange={jest.fn()}
                onSeriesListChange={onSeriesListChange}
            />,
        );

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
});
