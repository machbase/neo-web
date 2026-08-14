import { fireEvent, render, screen } from '@testing-library/react';
import {
    MIXED_X_AXIS_KIND_WARNING,
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
} from '../../seriesModel';
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
    {
        name: 'Axes',
        testId: 'editor-tab-axes',
        mutate: (panelInfo) => {
            panelInfo.axes.leftY.rawValueRange = { min: 1, max: 1 };
        },
    },
    {
        name: 'Axes',
        testId: 'editor-tab-axes',
        mutate: (panelInfo) => {
            panelInfo.axes.leftY.upperControlLimit = {
                enabled: true,
                value: undefined,
            };
        },
    },
    {
        name: 'Axes',
        testId: 'editor-tab-axes',
        mutate: (panelInfo) => {
            panelInfo.axes.rightY.enabled = true;
            panelInfo.axes.rightY.valueRange = { min: 2, max: 1 };
        },
    },
    {
        name: 'Data Setting',
        testId: 'editor-tab-data-setting',
        mutate: (panelInfo) => {
            panelInfo.display.mainChartSampling = {
                enabled: true,
                sampleCount: undefined,
            };
        },
    },
    {
        name: 'Data Setting',
        testId: 'editor-tab-data-setting',
        mutate: (panelInfo) => {
            panelInfo.display.rawNavigatorSampling = {
                enabled: true,
                sampleCount: -1,
            };
        },
    },
    {
        name: 'Data Setting',
        testId: 'editor-tab-data-setting',
        mutate: (panelInfo) => {
            panelInfo.display.pixelsPerTick.calculatedNavigator =
                Number.POSITIVE_INFINITY;
        },
    },
    {
        name: 'Display',
        testId: 'editor-tab-display',
        mutate: (panelInfo) => {
            panelInfo.display.stroke = Number.NEGATIVE_INFINITY;
        },
    },
];

const VALID_TAB_CASES: Array<{
    name: string;
    testId: string;
    mutate: (panelInfo: PanelInfo) => void;
}> = [
    {
        name: 'a negative control limit',
        testId: 'editor-tab-axes',
        mutate: (panelInfo) => {
            panelInfo.axes.leftY.upperControlLimit = {
                enabled: true,
                value: -10,
            };
        },
    },
    {
        name: 'an invalid draft on a disabled right axis',
        testId: 'editor-tab-axes',
        mutate: (panelInfo) => {
            panelInfo.axes.rightY.valueRange = { min: 2, max: 1 };
        },
    },
    {
        name: 'a disabled sampler with a non-finite count',
        testId: 'editor-tab-data-setting',
        mutate: (panelInfo) => {
            panelInfo.display.mainChartSampling = {
                enabled: false,
                sampleCount: Number.NaN,
            };
        },
    },
    {
        name: 'a finite negative display value',
        testId: 'editor-tab-display',
        mutate: (panelInfo) => {
            panelInfo.display.fill = -1;
        },
    },
];

function createEditor(
    panelInfo: PanelInfo,
    onApplyEditorConfig = jest.fn(),
    isOpen = true,
) {
    return (
        <PanelEditor
            pOnApplyEditorConfig={onApplyEditorConfig}
            pOnClose={jest.fn()}
            pIsOpen={isOpen}
            pPanelInfo={panelInfo}
            pHasUnsavedBoardChanges={false}
            pMainRange={{ start: 0, end: 10 }}
            pDataRange={{ start: 0, end: 100 }}
            pRollupTableList={{}}
        />
    );
}

function renderEditor(
    panelInfo: PanelInfo,
    onApplyEditorConfig = jest.fn(),
) {
    return render(createEditor(panelInfo, onApplyEditorConfig));
}

function changeTitle(value: string): void {
    fireEvent.change(screen.getByTestId('editor-title-input'), {
        target: { value },
    });
}

describe('PanelEditor validation', () => {
    it('shows right-axis settings only after the axis is enabled', () => {
        renderEditor(createNewPanelInfo([TIME_SERIES], 'Panel', 'Line'));
        fireEvent.click(screen.getByTestId('editor-tab-axes'));

        expect(
            screen.getByText('Enable the right Y axis to configure it.'),
        ).toBeInTheDocument();
        expect(screen.getAllByLabelText('Start the Y-axis at zero')).toHaveLength(1);

        fireEvent.click(screen.getByLabelText('Enable right Y-axis'));

        expect(
            screen.queryByText('Enable the right Y axis to configure it.'),
        ).not.toBeInTheDocument();
        expect(screen.getAllByLabelText('Start the Y-axis at zero')).toHaveLength(2);
    });

    it('keeps every tab validating while rendering only the active view', () => {
        const panelInfo = createNewPanelInfo([TIME_SERIES], 'Panel', 'Line');
        const view = renderEditor(panelInfo);

        const titleInput = screen.getByTestId('editor-title-input');
        expect(titleInput).toBeVisible();
        expect(
            screen.queryByLabelText('Show X-axis tick marks'),
        ).not.toBeInTheDocument();

        fireEvent.click(screen.getByTestId('editor-tab-axes'));

        expect(titleInput).not.toBeInTheDocument();
        expect(screen.getByLabelText('Show X-axis tick marks')).toBeVisible();

        view.rerender(createEditor(panelInfo, jest.fn(), false));

        expect(screen.getByTestId('editor-title-input')).toBeInTheDocument();
        expect(
            screen.queryByLabelText('Show X-axis tick marks'),
        ).not.toBeInTheDocument();
    });

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
        'marks $name invalid while its tab is hidden ($#)',
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

    it.each(VALID_TAB_CASES)(
        'accepts $name',
        ({ testId, mutate }) => {
            const panelInfo = createNewPanelInfo(
                [TIME_SERIES],
                'Panel',
                'Line',
            );
            mutate(panelInfo);
            renderEditor(panelInfo);

            changeTitle('Changed panel');

            expect(screen.getByTestId(testId)).not.toHaveAttribute(
                'aria-invalid',
            );
            expect(screen.getByTestId('editor-apply')).toBeEnabled();
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

    it('revalidates mounted tabs after closing and loading new input', () => {
        const validPanel = createNewPanelInfo(
            [TIME_SERIES],
            'Panel',
            'Line',
        );
        const invalidPanel = createNewPanelInfo(
            [TIME_SERIES],
            'Panel',
            'Line',
        );
        invalidPanel.key = validPanel.key;
        invalidPanel.axes.leftY.valueRange = { min: 2, max: 1 };
        const onApply = jest.fn();
        const view = renderEditor(validPanel, onApply);

        view.rerender(createEditor(invalidPanel, onApply, false));
        view.rerender(createEditor(invalidPanel, onApply));
        changeTitle('Invalid panel');

        expect(screen.getByTestId('editor-tab-axes')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
        expect(screen.getByTestId('editor-apply')).toBeDisabled();

        view.rerender(createEditor(validPanel, onApply, false));
        view.rerender(createEditor(validPanel, onApply));
        changeTitle('Valid panel');

        expect(screen.getByTestId('editor-tab-axes')).not.toHaveAttribute(
            'aria-invalid',
        );
        expect(screen.getByTestId('editor-apply')).toBeEnabled();
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
