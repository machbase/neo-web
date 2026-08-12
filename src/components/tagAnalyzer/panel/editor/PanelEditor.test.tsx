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
const LAST_VIEWED_RANGE = {
    mainRange: { start: 10, end: 20 },
    navigatorRange: { start: 0, end: 30 },
};
const INVALID_TAB_CASES: Array<{
    name: string;
    testId: string;
    mutate: (panelInfo: PanelInfo) => void;
}> = [
    {
        name: 'Axes',
        testId: 'editor-tab-axes',
        mutate: (panelInfo) => {
            panelInfo.axes.leftY.valueRange = { min: 2, max: 1 };
        },
    },
    {
        name: 'Data Setting',
        testId: 'editor-tab-data-setting',
        mutate: (panelInfo) => {
            panelInfo.display.pixelsPerTick.calculated = 0;
        },
    },
    {
        name: 'Display',
        testId: 'editor-tab-display',
        mutate: (panelInfo) => {
            panelInfo.display.pointRadius = Number.NaN;
        },
    },
    {
        name: 'Main Range',
        testId: 'editor-tab-main-range',
        mutate: (panelInfo) => {
            panelInfo.time.rangeInput = { start: 'now', end: 'now-1h' };
        },
    },
];

function renderEditor(
    panelInfo: PanelInfo,
    onApplyEditorConfig = jest.fn(),
) {
    return render(
        <PanelEditor
            pOnApplyEditorConfig={onApplyEditorConfig}
            pOnClose={jest.fn()}
            pIsOpen
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
    fireEvent.change(screen.getByTestId('editor-title-input'), {
        target: { value },
    });
}

describe('PanelEditor validation', () => {
    it('blocks a blank title', () => {
        renderEditor(createNewPanelInfo([TIME_SERIES], 'Panel', 'Line'));

        changeTitle('');

        expect(screen.getByTitle('Enter a panel title.')).toBeInTheDocument();
        expect(screen.getByTestId('editor-tab-general')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
        expect(screen.getByTestId('editor-apply')).toBeDisabled();

        changeTitle('Panel');
        expect(screen.getByTestId('editor-tab-general')).not.toHaveAttribute(
            'aria-invalid',
        );
    });

    it('blocks an empty series list', () => {
        renderEditor(createNewPanelInfo([], 'Panel', 'Line'));

        changeTitle('Changed panel');

        expect(screen.getByTitle('Add at least one series.')).toBeInTheDocument();
        expect(screen.getByTestId('editor-tab-data')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
        expect(screen.getByTestId('editor-apply')).toBeDisabled();
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
        expect(screen.getByTestId('editor-tab-data')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
        expect(screen.getByTestId('editor-tab-main-range')).not.toHaveAttribute(
            'aria-invalid',
        );
        expect(screen.getByTestId('editor-apply')).toBeDisabled();
    });

    it.each(INVALID_TAB_CASES)(
        'marks $name invalid while its tab is hidden',
        ({ name, testId, mutate }) => {
            const panelInfo = createNewPanelInfo(
                [TIME_SERIES],
                'Panel',
                'Line',
            );
            mutate(panelInfo);
            renderEditor(panelInfo);

            changeTitle('Changed panel');

            expect(screen.getByTestId(testId)).toHaveAttribute(
                'aria-invalid',
                'true',
            );
            expect(screen.getByTestId(testId)).toHaveAccessibleName(
                `${name}, invalid settings`,
            );
            expect(screen.getByTestId('editor-tab-general')).not.toHaveAttribute(
                'aria-invalid',
            );
            expect(screen.getByTestId('editor-apply')).toBeDisabled();
        },
    );

    it('marks every invalid tab from the complete draft', () => {
        const panelInfo = createNewPanelInfo([], 'Panel', 'Line');
        panelInfo.title = '';
        renderEditor(panelInfo);

        expect(screen.getByTestId('editor-tab-general')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
        expect(screen.getByTestId('editor-tab-data')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
    });
});

describe('PanelEditor apply', () => {
    it('normalizes the disabled secondary axis and keeps an unchanged saved range', () => {
        const panelInfo = createNewPanelInfo(
            [{ ...TIME_SERIES, useSecondaryAxis: true }],
            'Panel',
            'Line',
        );
        panelInfo.time = {
            ...panelInfo.time,
            useLastViewedRange: true,
            lastViewedRange: LAST_VIEWED_RANGE,
        };
        const onApplyEditorConfig = jest.fn();
        renderEditor(panelInfo, onApplyEditorConfig);

        changeTitle('Changed panel');
        fireEvent.click(screen.getByTestId('editor-apply'));

        expect(onApplyEditorConfig).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.objectContaining({
                    tagSet: [
                        expect.objectContaining({ useSecondaryAxis: false }),
                    ],
                }),
                time: expect.objectContaining({
                    lastViewedRange: LAST_VIEWED_RANGE,
                }),
            }),
        );
    });

    it('drops the saved visible range when the configured range changes', () => {
        const panelInfo = createNewPanelInfo(
            [TIME_SERIES],
            'Panel',
            'Line',
        );
        panelInfo.time = {
            rangeInput: { start: 'now-1h', end: 'now' },
            useLastViewedRange: true,
            lastViewedRange: LAST_VIEWED_RANGE,
        };
        const onApplyEditorConfig = jest.fn();
        renderEditor(panelInfo, onApplyEditorConfig);

        fireEvent.click(screen.getByText('Main Range'));
        fireEvent.change(screen.getByLabelText('From'), {
            target: { value: 'now-2h' },
        });
        fireEvent.click(screen.getByTestId('editor-apply'));

        expect(onApplyEditorConfig).toHaveBeenCalledWith(
            expect.objectContaining({
                time: expect.objectContaining({
                    rangeInput: { start: 'now-2h', end: 'now' },
                    lastViewedRange: undefined,
                }),
            }),
        );
    });
});
