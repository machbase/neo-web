import { fireEvent, render, screen } from '@testing-library/react';
import { TimeUnit } from '../../../range/intervalResolver';
import {
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
} from '../../../seriesModel';
import { createNewPanelInfo } from '../../panelModel';
import EditorDataTab from './EditorDataTab';
import EditorGeneralTab from './EditorGeneralTab';

jest.mock('../../series/PanelSeriesEditor', () => ({
    PanelSeriesEditor: ({
        onSeriesListChange,
    }: {
        onSeriesListChange: (seriesList: PanelSeriesDefinition[]) => void;
    }) => (
        <button type="button" onClick={() => onSeriesListChange([])}>
            Clear series draft
        </button>
    ),
}));

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

describe('panel editor data and general settings', () => {
    it('updates the configured interval without replacing the query', () => {
        const panel = createNewPanelInfo([], 'Panel', 'Line');
        const onQueryChange = jest.fn();

        render(
            <EditorDataTab
                pQueryDraft={panel.query}
                pRollupTableList={{}}
                pOnChangeQueryDraft={onQueryChange}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Automatic/i }));
        fireEvent.click(screen.getByRole('option', { name: 'Minute' }));

        expect(onQueryChange).toHaveBeenCalledWith({
            ...panel.query,
            intervalType: TimeUnit.Minute,
        });
    });

    it('restores automatic interval selection', () => {
        const panel = createNewPanelInfo([], 'Panel', 'Line');
        panel.query.intervalType = TimeUnit.Hour;
        const onQueryChange = jest.fn();

        render(
            <EditorDataTab
                pQueryDraft={panel.query}
                pRollupTableList={{}}
                pOnChangeQueryDraft={onQueryChange}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Hour/i }));
        fireEvent.click(screen.getByRole('option', { name: 'Automatic' }));

        expect(onQueryChange).toHaveBeenCalledWith({
            ...panel.query,
            intervalType: undefined,
        });
    });

    it('keeps series edits transactional until the modal is applied', () => {
        const panel = createNewPanelInfo([SERIES], 'Panel', 'Line');
        const onQueryChange = jest.fn();

        render(
            <EditorDataTab
                pQueryDraft={panel.query}
                pRollupTableList={{}}
                pOnChangeQueryDraft={onQueryChange}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Click to add a new series',
            }),
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Clear series draft' }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onQueryChange).not.toHaveBeenCalled();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Click to add a new series',
            }),
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Clear series draft' }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        expect(onQueryChange).toHaveBeenCalledWith({
            ...panel.query,
            tagSet: [],
        });
    });

    it('updates normalization without replacing the mode', () => {
        const panel = createNewPanelInfo([], 'Panel', 'Line');
        const onModeChange = jest.fn();

        render(
            <EditorGeneralTab
                pTitle={panel.title}
                pModeConfig={panel.mode}
                pDisplayConfig={panel.display}
                pTimeConfig={panel.time}
                pOnChangeTitle={jest.fn()}
                pOnChangeModeConfig={onModeChange}
                pOnChangeDisplayConfig={jest.fn()}
                pOnChangeTimeConfig={jest.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('checkbox', {
            name: 'Normalize values',
        }));

        expect(onModeChange).toHaveBeenCalledWith({
            ...panel.mode,
            useNormalize: true,
        });
    });
});
