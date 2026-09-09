import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import {
    MIXED_X_AXIS_KIND_WARNING,
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
} from '../../seriesModel';
import { createNewPanelInfo, type PanelInfo } from '../panelModel';
import PanelEditor from './PanelEditor';
import { formatRangeInputValue } from '../../format/inputFormat';
import type { ComponentProps } from 'react';
import { usePanelRangeRuntime } from '../panelRuntime';
import { seriesDataApi } from '../../api/seriesDataApi';

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
        name: 'Range',
        testId: 'editor-tab-range',
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
    rangeProps: Partial<Pick<ComponentProps<typeof PanelEditor>, 'pMainRange' | 'pNavigatorRange' | 'pDataRange' | 'pRangeOrigin' | 'pPreviewEditorRange'>> = {},
) {
    return (
        <PanelEditor
            pOnApplyEditorConfig={onApplyEditorConfig}
            pOnClose={jest.fn()}
            pPanelInfo={panelInfo}
            pHasUnsavedBoardChanges={false}
            pMainRange={{ start: 0, end: 10 }}
            pDataRange={{ start: 0, end: 100 }}
            pRollupTableList={{}}
            {...rangeProps}
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

        view.rerender(<></>);
        view.rerender(createEditor(panelInfo));

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
        fireEvent.click(screen.getByText('Range'));

        expect(screen.getAllByText(MIXED_X_AXIS_KIND_WARNING)).not.toHaveLength(0);
        expect(screen.getByTestId('editor-tab-data')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
        expect(screen.getByTestId('editor-tab-range')).not.toHaveAttribute(
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

        view.rerender(<></>);
        view.rerender(createEditor(invalidPanel, onApply));
        changeTitle('Invalid panel');

        expect(screen.getByTestId('editor-tab-axes')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
        expect(screen.getByTestId('editor-apply')).toBeDisabled();

        view.rerender(<></>);
        view.rerender(createEditor(validPanel, onApply));
        changeTitle('Valid panel');

        expect(screen.getByTestId('editor-tab-axes')).not.toHaveAttribute(
            'aria-invalid',
        );
        expect(screen.getByTestId('editor-apply')).toBeEnabled();
    });
});

describe('PanelEditor apply', () => {
    afterEach(() => jest.restoreAllMocks());

    it.each([
        { name: 'automatic Nav', navInput: { start: '', end: '' }, mainAfterReset: { start: 37.5, end: 62.5 } },
        { name: 'custom Nav', navInput: { start: 'first', end: 'first+80' }, mainAfterReset: { start: 10, end: 20 } },
    ])('previews the actual Main Reset result and preserves $name until Apply', async ({ navInput, mainAfterReset }) => {
        const fullRange = { start: 0, end: 100 };
        const navRange = { start: 0, end: navInput.end ? 80 : 100 };
        const panel = createNewPanelInfo([NUMERIC_SERIES], 'Panel', 'Line');
        panel.time.rangeInput = { start: 'first+10', end: 'first+20' };
        panel.time.navigatorRangeInput = navInput;
        const fetch = jest.spyOn(seriesDataApi, 'fetchSeriesFullRange').mockResolvedValue(fullRange);
        const runtimeInputs: Parameters<typeof usePanelRangeRuntime>[0] = {
            panelInfo: panel,
            rangeState: { range: { mainRange: { start: 10, end: 20 }, navigatorRange: navRange }, fullRange, navigatorRangeInput: navInput },
            isActive: true,
            onRangeStateChange: jest.fn(),
            onBroadcastError: jest.fn(),
            rangeRequests: { board: { numeric: { input: { start: '', end: '' }, applyVersion: 0 }, time: { input: { start: '', end: '' }, applyVersion: 0 } } },
            commandVersions: { refreshDataVersion: 0, refreshRangeVersion: 0, expandFullRangeVersion: 0 },
        };
        const runtime = renderHook(() => usePanelRangeRuntime(runtimeInputs));
        act(() => runtime.result.current.actions.setChartAreaWidth(400));
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
        const apply = jest.fn<void, [PanelInfo]>();
        render(createEditor(panel, apply, {
            pMainRange: { start: 10, end: 20 }, pNavigatorRange: navRange,
            pPreviewEditorRange: (config) => runtime.result.current.previewEditorRange(config),
        }));
        fireEvent.click(screen.getByTestId('editor-tab-range'));
        fireEvent.click(mainRangeSection().getByRole('button', { name: 'Reset' }));
        expect(mainRangeSection().getByLabelText('Distance from')).toHaveValue(String(mainAfterReset.start));
        expect(mainRangeSection().getByLabelText('Distance to')).toHaveValue(String(mainAfterReset.end));
        expect(mainRangeSection().getByTestId('from-slider')).toHaveValue(String(mainAfterReset.start));
        expect(mainRangeSection().getByTestId('to-slider')).toHaveValue(String(mainAfterReset.end));
        expect(mainRangeSection().getByText('Auto')).toBeVisible();
        expect(mainRangeSection().getByRole('button', { name: 'Reset' })).toBeDisabled();
        expect(apply).not.toHaveBeenCalled();
        expect(runtime.result.current.rangeState?.range.mainRange).toEqual({ start: 10, end: 20 });
        fireEvent.click(screen.getByTestId('editor-apply'));
        const applied = apply.mock.calls[0][0];
        expect(applied.time.rangeInput).toEqual({ start: '', end: '' });
        expect(applied.time.navigatorRangeInput).toEqual(navInput);
        act(() => runtime.result.current.actions.reloadAfterEditorSave(applied));
        await waitFor(() => expect(runtime.result.current.rangeState?.range.mainRange).toEqual(mainAfterReset));
        expect(runtime.result.current.rangeState?.range.navigatorRange).toEqual(navRange);
        fetch.mockRestore();
    });

    it.each([
        { series: TIME_SERIES, from: 'From', to: 'To', offset: 'ms' },
        { series: NUMERIC_SERIES, from: 'Distance from', to: 'Distance to', offset: '' },
    ])('embeds both range editors with Main first and couples drafts until Apply ($from)', ({ series, from, to, offset }) => {
        const panel = createNewPanelInfo([series], 'Panel', 'Line');
        panel.time.useLastViewedRange = true;
        panel.time.lastViewedRange = LAST_VIEWED_RANGE;
        const apply = jest.fn();
        renderEditor(panel, apply);
        fireEvent.click(screen.getByTestId('editor-tab-range'));
        const mainElement = screen.getByTestId('editor-main-range');
        const navElement = screen.getByTestId('editor-nav-range');
        expect(mainElement.compareDocumentPosition(navElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.queryByTestId('range-summary')).not.toBeInTheDocument();
        const main = within(mainElement);
        const nav = within(navElement);
        expect(main.getByLabelText(from)).toBeVisible();
        expect(nav.getByLabelText(from)).toBeVisible();
        fireEvent.change(nav.getByLabelText(from), { target: { value: 'first' } });
        fireEvent.change(nav.getByLabelText(to), { target: { value: 'first' } });
        expect(screen.getByTestId('editor-apply')).toBeDisabled();
        fireEvent.change(nav.getByLabelText(to), { target: { value: 'first+50' + offset } });
        fireEvent.change(main.getByLabelText(from), { target: { value: 'first+10' + offset } });
        fireEvent.change(main.getByLabelText(to), { target: { value: 'first+20' + offset } });
        expect(apply).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId('editor-apply'));
        expect(apply).toHaveBeenLastCalledWith(expect.objectContaining({
            time: expect.objectContaining({
                navigatorRangeInput: { start: 'first', end: 'first+50' + offset },
                rangeInput: { start: 'first+10' + offset, end: 'first+20' + offset },
                lastViewedRange: undefined,
            }),
        }));
        fireEvent.click(nav.getByRole('button', { name: 'Reset' }));
        expect(main.getByLabelText(from)).toHaveValue('first+10' + offset);
        fireEvent.click(screen.getByTestId('editor-apply'));
        expect(apply).toHaveBeenLastCalledWith(expect.objectContaining({
            time: expect.objectContaining({
                navigatorRangeInput: { start: '', end: '' },
                rangeInput: { start: 'first+10' + offset, end: 'first+20' + offset },
            }),
        }));
    });

    it('embeds calendar inputs and time presets in each range section', () => {
        const apply = jest.fn();
        renderEditor(createNewPanelInfo([TIME_SERIES], 'Panel', 'Line'), apply);
        fireEvent.click(screen.getByTestId('editor-tab-range'));
        const main = mainRangeSection();
        const nav = within(screen.getByTestId('editor-nav-range'));
        for (const range of [main, nav]) {
            expect(range.getByLabelText('From')).toHaveValue('');
            expect(range.getAllByRole('button', { name: 'Open date picker' })).toHaveLength(2);
            expect(range.getByTestId('quick-time-range')).toBeVisible();
        }
        fireEvent.click(main.getByRole('button', { name: 'First 1 hour of data' }));
        expect(main.getByLabelText('From')).toHaveValue('first');
        expect(main.getByLabelText('To')).toHaveValue('first+1h');
        expect(nav.getByLabelText('To')).toHaveValue('first+1h');
        expect(apply).not.toHaveBeenCalled();
    });

    it('embeds both distance sliders and quick windows over the full data extent', () => {
        const apply = jest.fn();
        renderEditor(createNewPanelInfo([NUMERIC_SERIES], 'Panel', 'Line'), apply);
        fireEvent.click(screen.getByTestId('editor-tab-range'));
        const main = mainRangeSection();
        const nav = within(screen.getByTestId('editor-nav-range'));
        for (const range of [main, nav]) {
            expect(range.getByTestId('distance-range-slider')).toBeVisible();
            expect(range.getByLabelText('Distance from')).toHaveValue('0');
            expect(range.getByLabelText('Distance to')).toHaveValue(range === main ? '10' : '100');
        }
        fireEvent.click(main.getByTestId('first-10'));
        fireEvent.click(nav.getByTestId('last-25'));
        expect(main.getByLabelText('Distance to')).toHaveValue('85');
        expect(nav.getByLabelText('Distance from')).toHaveValue('last-25');
        expect(apply).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId('editor-apply'));
        expect(apply).toHaveBeenCalledWith(expect.objectContaining({
            time: expect.objectContaining({
                rangeInput: { start: 'last-25', end: '85' },
                navigatorRangeInput: { start: 'last-25', end: 'last' },
            }),
        }));
    });

    it.each(['main', 'nav'])('retains invalid %s distance drafts across tabs and blocks Apply', (target) => {
        renderEditor(createNewPanelInfo([NUMERIC_SERIES], 'Panel', 'Line'));
        fireEvent.click(screen.getByTestId('editor-tab-range'));
        const range = () => within(screen.getByTestId('editor-' + target + '-range'));
        fireEvent.click(range().getByTestId('first-50'));
        for (const value of ['bad input', '', 'first+50', 'first+75']) {
            fireEvent.change(range().getByLabelText('Distance from'), { target: { value } });
            expect(screen.getByTestId('editor-apply')).toBeDisabled();
            fireEvent.click(screen.getByTestId('editor-tab-general'));
            expect(screen.getByTestId('editor-apply')).toBeDisabled();
            fireEvent.click(screen.getByTestId('editor-tab-range'));
            expect(range().getByLabelText('Distance from')).toHaveValue(value);
        }
        fireEvent.change(range().getByLabelText('Distance from'), { target: { value: 'first+10' } });
        expect(screen.getByTestId('editor-apply')).toBeEnabled();
    });

    it.each([
        { series: NUMERIC_SERIES, from: 'Distance from', to: 'Distance to', unit: '', numeric: true },
        { series: TIME_SERIES, from: 'From', to: 'To', unit: 'ms', numeric: false },
    ])('only adjusts the other range when containment requires it and waits for Apply ($from)', ({ series, from, to, unit, numeric }) => {
        const panel = createNewPanelInfo([series], 'Panel', 'Line');
        panel.time.rangeInput = { start: 'first+10' + unit, end: 'first+20' + unit };
        panel.time.navigatorRangeInput = { start: 'first', end: 'first+50' + unit };
        const originalTime = JSON.stringify(panel.time);
        const apply = jest.fn();
        renderEditor(panel, apply);
        fireEvent.click(screen.getByTestId('editor-tab-range'));
        const main = mainRangeSection();
        const nav = within(screen.getByTestId('editor-nav-range'));

        fireEvent.change(nav.getByLabelText(to), { target: { value: 'first+100' + unit } });
        expect(main.getByLabelText(from)).toHaveValue('first+10' + unit);
        expect(main.getByLabelText(to)).toHaveValue('first+20' + unit);
        fireEvent.change(nav.getByLabelText(to), { target: { value: 'first+15' + unit } });
        expect(main.getByLabelText(from)).toHaveValue(formatRangeInputValue(5, numeric));
        expect(main.getByLabelText(to)).toHaveValue('first+15' + unit);
        fireEvent.change(nav.getByLabelText(to), { target: { value: '' } });
        fireEvent.change(nav.getByLabelText(to), { target: { value: 'first+50' + unit } });
        expect(main.getByLabelText(from)).toHaveValue(formatRangeInputValue(5, numeric));
        expect(main.getByLabelText(to)).toHaveValue('first+15' + unit);

        fireEvent.change(main.getByLabelText(to), { target: { value: 'first+75' + unit } });
        expect(nav.getByLabelText(to)).toHaveValue('first+75' + unit);
        expect(nav.getByLabelText(from)).toHaveValue('first');
        fireEvent.change(main.getByLabelText(to), { target: { value: 'first+60' + unit } });
        expect(nav.getByLabelText(to)).toHaveValue('first+75' + unit);
        expect(apply).not.toHaveBeenCalled();
        expect(JSON.stringify(panel.time)).toBe(originalTime);

        fireEvent.click(screen.getByTestId('editor-tab-general'));
        fireEvent.click(screen.getByTestId('editor-tab-range'));
        expect(mainRangeSection().getByLabelText(to)).toHaveValue('first+60' + unit);
        fireEvent.click(screen.getByTestId('editor-apply'));
        expect(apply).toHaveBeenCalledTimes(1);
        expect(apply).toHaveBeenCalledWith(expect.objectContaining({
            time: expect.objectContaining({
                rangeInput: { start: formatRangeInputValue(5, numeric), end: 'first+60' + unit },
                navigatorRangeInput: { start: 'first', end: 'first+75' + unit },
            }),
        }));
    });

    it('keeps the current time boundary when one input is blank', () => {
        const apply = jest.fn();
        renderEditor(createNewPanelInfo([TIME_SERIES], 'Panel', 'Line'), apply);
        fireEvent.click(screen.getByTestId('editor-tab-range'));
        fireEvent.change(mainRangeSection().getByLabelText('To'), { target: { value: 'last' } });
        fireEvent.click(screen.getByTestId('editor-apply'));
        expect(apply).toHaveBeenCalledWith(expect.objectContaining({
            time: expect.objectContaining({ rangeInput: { start: '', end: 'last' } }),
        }));
    });

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

        fireEvent.click(screen.getByText('Range'));
        const dialog = mainRangeSection();
        fireEvent.change(dialog.getByLabelText('From'), {
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

describe('PanelEditor chart range synchronization', () => {
    it.each([
        { series: NUMERIC_SERIES, from: 'Distance from', to: 'Distance to', numeric: true },
        { series: TIME_SERIES, from: 'From', to: 'To', numeric: false },
    ])('replaces range drafts after chart changes and preserves other settings ($from)', ({ series, from, to, numeric }) => {
        const panel = createNewPanelInfo([series], 'Panel', 'Line');
        const apply = jest.fn();
        const view = renderEditor(panel, apply);
        changeTitle('Keep this title');
        fireEvent.click(screen.getByTestId('editor-normalize-checkbox'));
        fireEvent.click(screen.getByTestId('editor-save-visible-range-checkbox'));
        fireEvent.click(screen.getByTestId('editor-tab-range'));
        fireEvent.change(mainRangeSection().getByLabelText(from), { target: { value: 'invalid draft' } });
        fireEvent.change(within(screen.getByTestId('editor-nav-range')).getByLabelText(to), { target: { value: 'invalid nav' } });
        expect(screen.getByTestId('editor-apply')).toBeDisabled();

        // New objects and data refreshes at the same viewport must leave the draft alone.
        view.rerender(createEditor(panel, apply, { pDataRange: { start: 0, end: 200 }, pNavigatorRange: { start: 0, end: 100 } }));
        expect(mainRangeSection().getByLabelText(from)).toHaveValue('invalid draft');

        const chartProps = {
            pMainRange: { start: 50, end: 70 },
            pNavigatorRange: { start: 0, end: 100 },
            pRangeOrigin: 'chart' as const,
        };
        view.rerender(createEditor(panel, apply, chartProps));
        const format = (value: number) => formatRangeInputValue(value, numeric);
        expect(mainRangeSection().getByLabelText(from)).toHaveValue(format(50));
        expect(mainRangeSection().getByLabelText(to)).toHaveValue(format(70));
        expect(within(screen.getByTestId('editor-nav-range')).getByLabelText(to)).toHaveValue(format(100));
        expect(screen.getByTestId('editor-apply')).toBeEnabled();
        expect(apply).not.toHaveBeenCalled();
        expect(panel.time.rangeInput).toEqual({ start: '', end: '' });

        // Navigator-only changes also win, even while another tab is open.
        fireEvent.change(mainRangeSection().getByLabelText(to), { target: { value: format(80) } });
        view.rerender(createEditor(panel, apply, { ...chartProps, pMainRange: { ...chartProps.pMainRange } }));
        expect(mainRangeSection().getByLabelText(to)).toHaveValue(format(80));
        fireEvent.click(screen.getByTestId('editor-tab-general'));
        view.rerender(createEditor(panel, apply, { ...chartProps, pNavigatorRange: { start: 0, end: 150 } }));
        expect(screen.getByTestId('editor-title-input')).toHaveValue('Keep this title');
        expect(screen.getByTestId('editor-normalize-checkbox')).toBeChecked();
        expect(screen.getByTestId('editor-save-visible-range-checkbox')).toBeChecked();
        fireEvent.click(screen.getByTestId('editor-tab-range'));
        expect(mainRangeSection().getByLabelText(to)).toHaveValue(format(70));
        expect(within(screen.getByTestId('editor-nav-range')).getByLabelText(to)).toHaveValue(format(150));
        fireEvent.change(mainRangeSection().getByLabelText(to), { target: { value: format(75) } });
        expect(apply).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId('editor-apply'));
        expect(apply).toHaveBeenCalledTimes(1);
        expect(apply).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Keep this title',
            mode: expect.objectContaining({ useNormalize: true }),
            time: expect.objectContaining({
                useLastViewedRange: true,
                rangeInput: { start: format(50), end: format(75) },
                navigatorRangeInput: { start: format(0), end: format(150) },
            }),
        }));
    });

    it('opens with ranges from an earlier chart interaction', () => {
        const panel = createNewPanelInfo([NUMERIC_SERIES], 'Panel', 'Line');
        render(createEditor(panel, jest.fn(), {
            pMainRange: { start: 25, end: 35 },
            pNavigatorRange: { start: 10, end: 90 },
            pRangeOrigin: 'chart',
        }));
        fireEvent.click(screen.getByTestId('editor-tab-range'));
        expect(mainRangeSection().getByLabelText('Distance from')).toHaveValue('25');
        expect(within(screen.getByTestId('editor-nav-range')).getByLabelText('Distance from')).toHaveValue('10');
    });

    it('preserves applied expressions and newer edits when the Apply response changes the chart', () => {
        const panel = createNewPanelInfo([NUMERIC_SERIES], 'Panel', 'Line');
        const apply = jest.fn<void, [PanelInfo]>();
        const view = renderEditor(panel, apply);
        fireEvent.click(screen.getByTestId('editor-tab-range'));
        fireEvent.click(mainRangeSection().getByTestId('first-50'));
        fireEvent.click(screen.getByTestId('editor-apply'));
        const applied = apply.mock.calls[0][0];
        view.rerender(createEditor(applied, apply, { pMainRange: { start: 0, end: 50 }, pRangeOrigin: 'configured' }));
        expect(mainRangeSection().getByLabelText('Distance from')).toHaveValue(applied.time.rangeInput.start);
        expect(mainRangeSection().getByLabelText('Distance to')).toHaveValue(applied.time.rangeInput.end);
        expect(screen.getByTestId('editor-apply')).toBeDisabled();

        fireEvent.click(mainRangeSection().getByTestId('first-25'));
        fireEvent.click(screen.getByTestId('editor-apply'));
        const secondApply = apply.mock.calls[1][0];
        fireEvent.change(mainRangeSection().getByLabelText('Distance to'), { target: { value: 'first+30' } });
        view.rerender(createEditor(secondApply, apply, { pMainRange: { start: 0, end: 25 }, pRangeOrigin: 'configured' }));
        expect(mainRangeSection().getByLabelText('Distance to')).toHaveValue('first+30');
        expect(screen.getByTestId('editor-apply')).toBeEnabled();

        view.rerender(createEditor(secondApply, apply, { pMainRange: { start: 10, end: 20 }, pRangeOrigin: 'chart' }));
        expect(mainRangeSection().getByLabelText('Distance to')).toHaveValue('20');
    });
});

function mainRangeSection() {
    return within(screen.getByTestId('editor-main-range'));
}
