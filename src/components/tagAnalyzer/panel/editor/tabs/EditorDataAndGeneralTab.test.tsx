import { fireEvent, render, screen } from '@testing-library/react';
import { TimeUnit } from '../../../range/intervalResolver';
import {
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
} from '../../../seriesModel';
import { createNewPanelInfo } from '../../panelModel';
import EditorDataTab from './EditorDataTab';
import EditorGeneralTab from './EditorGeneralTab';
import { X_AXIS_KIND_CHANGE_WARNING } from '../../series/PanelSeriesEditor';

jest.mock('../../series/PanelSeriesEditor', () => ({
    X_AXIS_KIND_CHANGE_WARNING: 'The panel x-axis type cannot be changed.',
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
const NUMERIC_SERIES: PanelSeriesDefinition = {
    ...SERIES,
    key: 'numeric-series',
    sourceColumns: {
        ...SERIES.sourceColumns,
        timeBaseTime: true,
        timeType: 4,
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
                pLockedAxisKind={undefined}
                pOnChangeQueryDraft={onQueryChange}
                pReportValidity={jest.fn()}
                pIsActive
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
                pLockedAxisKind={undefined}
                pOnChangeQueryDraft={onQueryChange}
                pReportValidity={jest.fn()}
                pIsActive
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
                pLockedAxisKind="time"
                pOnChangeQueryDraft={onQueryChange}
                pReportValidity={jest.fn()}
                pIsActive
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

    it('closes its portalled series dialog when the tab becomes inactive', () => {
        const panel = createNewPanelInfo([SERIES], 'Panel', 'Line');
        const props = {
            pQueryDraft: panel.query,
            pRollupTableList: {},
            pLockedAxisKind: 'time' as const,
            pOnChangeQueryDraft: jest.fn(),
            pReportValidity: jest.fn(),
        };
        const view = render(<EditorDataTab {...props} pIsActive />);

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Click to add a new series',
            }),
        );
        expect(screen.getByTestId('editor-series-dialog')).toBeInTheDocument();

        view.rerender(<EditorDataTab {...props} pIsActive={false} />);
        expect(screen.queryByTestId('editor-series-dialog')).not.toBeInTheDocument();

        view.rerender(<EditorDataTab {...props} pIsActive />);
        expect(screen.queryByTestId('editor-series-dialog')).not.toBeInTheDocument();
    });

    it('rejects a stale modal draft when the incoming axis kind changes', () => {
        const timePanel = createNewPanelInfo([SERIES], 'Panel', 'Line');
        const numericPanel = createNewPanelInfo(
            [NUMERIC_SERIES],
            'Panel',
            'Line',
        );
        const onQueryChange = jest.fn();
        const props = {
            pRollupTableList: {},
            pOnChangeQueryDraft: onQueryChange,
            pReportValidity: jest.fn(),
            pIsActive: true,
        };
        const view = render(
            <EditorDataTab
                {...props}
                pQueryDraft={timePanel.query}
                pLockedAxisKind="time"
            />,
        );
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Click to add a new series',
            }),
        );

        view.rerender(
            <EditorDataTab
                {...props}
                pQueryDraft={numericPanel.query}
                pLockedAxisKind="numeric"
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        expect(onQueryChange).not.toHaveBeenCalled();
        expect(screen.getByRole('status')).toHaveTextContent(
            X_AXIS_KIND_CHANGE_WARNING,
        );
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
                pReportValidity={jest.fn()}
                pIsActive
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
