import { act, renderHook } from '@testing-library/react';
import { helper, init } from 'echarts';
import { createNewPanelInfo } from '../panel/panelModel';
import { createPanelChartPresentation } from '../panel/panelChartPresentation';
import { useChartInteraction, type ChartInteractionInputs } from './chartInteraction';
import { PanelOverlayMode } from './chartModel';

function createInputs(): ChartInteractionInputs {
    const panelInfo = createNewPanelInfo([], 'Chart', 'Line');
    const chartData: ChartInteractionInputs['data']['chartData'] = [{
        name: 'Temperature', echartsName: 'Temperature', color: '#123456', yAxis: 0,
        data: [[0, 1], [50, 3], [100, 2]],
    }];
    return {
        refs: { chartAreaRef: { current: null }, chartApiRef: { current: null } },
        runtimeConfig: createPanelChartPresentation(panelInfo),
        overlayMode: PanelOverlayMode.NO_OVERLAY,
        data: { chartData, navigatorChartData: chartData },
        rangeState: { mainRange: { start: 0, end: 100 }, navigatorRange: { start: -100, end: 200 } },
        handlers: {
            rangeActions: { setMainRange: jest.fn(), shiftMainRangeLeft: jest.fn(), shiftMainRangeRight: jest.fn() },
            markupHandlers: {
                onOpenCreateAnnotation: jest.fn(), onActivateHighlightEditor: jest.fn(), onActivateAnnotationEditor: jest.fn(),
            },
            onHoveredMainSeriesChange: jest.fn(), onSelection: jest.fn(),
        },
    };
}

function hoverMainSeries(chart: ReturnType<typeof init>): { zrX: number; zrY: number } {
    const zr = chart.getZr();
    const target = zr.storage.getDisplayList(true).find((element) =>
        helper.getECData(element).eventData?.seriesIndex === 0,
    );
    if (!target) throw new Error('The rendered main series has no event target.');
    const [zrX, zrY] = chart.convertToPixel({ seriesIndex: 0 }, [50, 3]);
    // SVG SSR cannot hit-test this line. Use its real rendered element;
    // native ZRender still owns hover state and ECharts resolves the event.
    const hitTest = jest.spyOn(zr.handler, 'findHover')
        .mockReturnValue({ x: zrX, y: zrY, target, topTarget: target });
    try {
        zr.handler.dispatch('mousemove', { zrX, zrY });
    } finally {
        hitTest.mockRestore();
    }
    return { zrX, zrY };
}

it.each(['empty', 'same-count'])('retires a hovered series during %s reload without disabling new interactions', (replacement) => {
    const chart = init(null, undefined, { renderer: 'svg', ssr: true, width: 800, height: 500 });
    const inputs = createInputs();
    const view = renderHook(useChartInteraction, { initialProps: inputs });
    const zr = chart.getZr();
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
        act(() => view.result.current.onChartReady(chart));
        chart.setOption({ animation: false }, { lazyUpdate: false });
        const onHover = jest.fn();
        const onMove = jest.fn();
        chart.on('mouseover', onHover);
        chart.on('mousemove', onMove);
        const position = hoverMainSeries(chart);
        expect(onHover).toHaveBeenCalledWith(expect.objectContaining({
            componentType: 'series', seriesIndex: 0, seriesName: 'Temperature',
        }));
        const nextSeries: ChartInteractionInputs['data']['chartData'] = replacement === 'empty' ? [] : [{
            ...inputs.data.chartData[0], data: [[0, 5], [50, 3], [100, 6]],
        }];
        view.rerender({ ...inputs, data: { chartData: nextSeries, navigatorChartData: nextSeries } });
        expect(chart.getOption()).toMatchObject({
            series: replacement === 'empty' ? [] : [
                { id: 'main-series-0', data: nextSeries[0].data },
                { id: 'navigator-series-0', data: nextSeries[0].data },
            ],
        });
        act(() => zr.handler.dispatch('mouseout', position));
        expect(warning.mock.calls).toEqual([]);

        if (replacement === 'empty') view.rerender(inputs);
        chart.setOption({ animation: false }, { lazyUpdate: false });
        hoverMainSeries(chart);
        expect(onMove).toHaveBeenCalledTimes(2);
        expect(onMove).toHaveBeenLastCalledWith(expect.objectContaining({
            componentType: 'series', seriesIndex: 0, seriesName: 'Temperature',
        }));
        chart.on('legendselectchanged', view.result.current.onEvents.legendselectchanged);
        act(() => { chart.dispatchAction({ type: 'legendToggleSelect', name: 'Temperature' }); });
        expect(inputs.refs.chartApiRef.current?.getVisibleSeries()).toEqual([{ name: 'Temperature', visible: false }]);

        expect(warning.mock.calls).toEqual([]);
    } finally {
        warning.mockRestore();
        view.unmount();
        chart.dispose();
    }
});

it('renders and updates the chart through native ECharts', () => {
    const chart = init(null, undefined, { renderer: 'svg', ssr: true, width: 800, height: 500 });
    const inputs = createInputs();
    const { chartData } = inputs.data;
    const view = renderHook(useChartInteraction, { initialProps: inputs });
    try {
        act(() => view.result.current.onChartReady(chart));
        expect(chart.renderToSVGString()).toContain('<svg');
        expect(chart.getOption()).toMatchObject({
            series: [{ id: 'main-series-0', data: chartData[0].data }, { id: 'navigator-series-0', data: chartData[0].data }],
        });
        view.rerender({ ...inputs, rangeState: { ...inputs.rangeState, mainRange: { start: 20, end: 80 } } });
        expect(chart.getOption()).toMatchObject({
            xAxis: [expect.objectContaining({ min: 20, max: 80 }), expect.anything(), expect.anything()],
            dataZoom: expect.arrayContaining([expect.objectContaining({ id: 'panel-slider-data-zoom', startValue: 20, endValue: 80 })]),
            series: [expect.objectContaining({ data: chartData[0].data }), expect.objectContaining({ data: chartData[0].data })],
        });
        chart.on('legendselectchanged', view.result.current.onEvents.legendselectchanged);
        act(() => { chart.dispatchAction({ type: 'legendToggleSelect', name: 'Temperature' }); });
        expect(inputs.refs.chartApiRef.current?.getVisibleSeries()).toEqual([{ name: 'Temperature', visible: false }]);
        act(() => { chart.dispatchAction({ type: 'legendToggleSelect', name: 'Temperature' }); });
        view.rerender({
            ...inputs,
            overlayMode: PanelOverlayMode.HIGHLIGHT,
            draftHighlight: { text: 'Band', range: { start: 25, end: 75 }, fillColor: '#123456', textColor: '#ffffff' },
            data: {
                chartData: [{ ...chartData[0], data: [[0, 5], [50, 8], [100, 6]] }],
                navigatorChartData: [{ ...chartData[0], data: [[0, 9], [50, 2], [100, 7]] }],
            },
        });
        expect(chart.getOption()).toMatchObject({
            series: expect.arrayContaining([
                expect.objectContaining({ id: 'main-series-0', data: [[0, 5], [50, 8], [100, 6]] }),
                expect.objectContaining({ id: 'navigator-series-0', data: [[0, 9], [50, 2], [100, 7]] }),
                expect.objectContaining({ id: 'highlight-labels' }),
            ]),
        });
        expect(chart.renderToSVGString()).toContain('Band');
        act(() => { chart.dispatchAction({ type: 'legendToggleSelect', name: 'Temperature' }); });
        expect(inputs.refs.chartApiRef.current?.getVisibleSeries()).toEqual([{ name: 'Temperature', visible: false }]);
    } finally {
        view.unmount();
        chart.dispose();
    }
});
