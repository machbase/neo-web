/**
 * The chart runtime arrives as a server script, so a panel can mount before it lands.
 *
 * Regression: the effect that writes the option bailed on a null instance ref and was not keyed on
 * the runtime, so a chart opened before /web/echarts/echarts.min.js finished loading ended up
 * created but never configured. ECharts leaves `_model` undefined until the first setOption, and
 * the panel's own pointer handlers call convertFromPixel / containPixel — which reach
 * `ecModel.queryComponents` and throw "Cannot read properties of undefined".
 */
import { act, render, waitFor } from '@testing-library/react';
import { ECHARTS_SRC, __setEchartsRuntimeForTest } from '@/plugin/echartsRuntime';
import TagEChart from './TagEChart';

const setOption = jest.fn();
const instance = {
    setOption,
    resize: jest.fn(),
    dispose: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    getOption: jest.fn(() => ({})),
    containPixel: jest.fn(() => false),
    convertFromPixel: jest.fn(() => undefined),
    convertToPixel: jest.fn(() => undefined),
    dispatchAction: jest.fn(),
    getZr: jest.fn(() => ({ on: jest.fn(), off: jest.fn() })),
};
const init = jest.fn(() => instance);
const runtime = { init, registerTheme: jest.fn() };

/** jsdom never fetches, so play the part of the network: install the UMD's global, then fire onload. */
const landRuntimeScript = async () => {
    const sTag = Array.from(document.querySelectorAll('script')).find((aNode) =>
        aNode.src.endsWith(ECHARTS_SRC)
    );
    if (!sTag) throw new Error('the runtime script was never requested');
    (window as any).echarts = runtime;
    await act(async () => {
        sTag.onload?.(new Event('load'));
    });
};

const props = {
    series: [{ name: 'TAG-1', data: [[1000, 1] as [number, number | null]] }],
    timeFormat: 'YYYY-MM-DD HH:mm:ss',
    timeZone: 'UTC',
    timeRange: { startTime: 1000, endTime: 2000 },
};

beforeEach(() => {
    setOption.mockClear();
    init.mockClear();
    document.head.innerHTML = '';
    delete (window as any).__chartextScriptPromises;
    __setEchartsRuntimeForTest(undefined);
    delete (window as any).echarts;
});

it('configures the chart even when the runtime lands after the panel mounted', async () => {
    render(<TagEChart {...props} />);

    // Runtime not there yet: the panel renders, but nothing is initialised.
    expect(init).not.toHaveBeenCalled();
    expect(setOption).not.toHaveBeenCalled();

    await landRuntimeScript();

    await waitFor(() => expect(init).toHaveBeenCalledTimes(1));
    // The point of the regression: creating the instance is not enough. Without the option the
    // chart has no model, and the first pointer event throws inside parseFinder.
    expect(setOption).toHaveBeenCalled();
});

it('still configures the chart when the runtime was already there', () => {
    __setEchartsRuntimeForTest(runtime as never);

    render(<TagEChart {...props} />);

    expect(init).toHaveBeenCalledTimes(1);
    expect(setOption).toHaveBeenCalled();
});
