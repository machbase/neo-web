import { fireEvent, render, screen } from '@testing-library/react';
import {
    MIXED_X_AXIS_KIND_WARNING,
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
} from '../../seriesModel';
import type { PanelDataLoadMetrics } from '../internal/panelData';
import { createNewPanelInfo, type PanelInfo } from '../panelModel';
import PanelEditor from './PanelEditor';

const TIME_SERIES: PanelSeriesDefinition = {
    key: 'time-series',
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
    ...TIME_SERIES,
    key: 'numeric-series',
    sourceTagName: 'TAG_B',
    sourceColumns: {
        ...TIME_SERIES.sourceColumns,
        timeBaseTime: true,
        timeType: 4,
    },
};
const EMPTY_METRICS: PanelDataLoadMetrics = {
    main: {
        queriedEntries: undefined,
        pointCount: undefined,
        pixelWidth: undefined,
    },
    navigator: {
        queriedEntries: undefined,
        pointCount: undefined,
        pixelWidth: undefined,
    },
};

function renderEditor(panelInfo: PanelInfo) {
    return render(
        <PanelEditor
            pOnApplyEditorConfig={jest.fn()}
            pOnClose={jest.fn()}
            pOnAnimationEnd={jest.fn()}
            pAnimationState="opening"
            pPanelInfo={panelInfo}
            pHasUnsavedBoardChanges={false}
            pMainRange={{ start: 0, end: 10 }}
            pDataRange={{ start: 0, end: 100 }}
            pRollupTableList={{}}
            pDataSettingMetrics={EMPTY_METRICS}
        />,
    );
}

function changeTitle(value: string): void {
    fireEvent.change(screen.getByRole('textbox', { name: 'Chart title' }), {
        target: { value },
    });
}

describe('PanelEditor validation', () => {
    it('blocks a blank title', () => {
        renderEditor(createNewPanelInfo([TIME_SERIES], 'Panel', 'Line'));

        changeTitle('');

        expect(screen.getByTitle('Enter a panel title.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    });

    it('blocks an empty series list', () => {
        renderEditor(createNewPanelInfo([], 'Panel', 'Line'));

        changeTitle('Changed panel');

        expect(screen.getByTitle('Add at least one series.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    });

    it('blocks mixed axes and does not present a fabricated range editor', () => {
        renderEditor(
            createNewPanelInfo(
                [TIME_SERIES, NUMERIC_SERIES],
                'Panel',
                'Line',
            ),
        );

        changeTitle('Changed panel');
        fireEvent.click(screen.getByText('Main Range'));

        expect(screen.getAllByText(MIXED_X_AXIS_KIND_WARNING)).not.toHaveLength(0);
        expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    });
});
