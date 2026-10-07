/**
 * The wrapper that replaced echarts-for-react. These cover the behaviour the package used to
 * provide, which nothing else in the suite exercises — PanelChart.test mocks this component out.
 */
import { act, render } from '@testing-library/react';
import { EChart } from './EChart';
import { __setEchartsRuntimeForTest } from '@/plugin/echartsRuntime';

const setOption = jest.fn();
const resize = jest.fn();
const dispose = jest.fn();
const on = jest.fn();
const off = jest.fn();
const init = jest.fn(() => ({ setOption, resize, dispose, on, off }));
const runtime = { init } as never;

/** jsdom reports every element as 0x0, and the wrapper waits for a real size before it initialises. */
const stubSize = () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 600 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 400 });
};

let resizeCallbacks: Array<() => void> = [];

beforeEach(() => {
    [setOption, resize, dispose, on, off, init].forEach((m) => m.mockClear());
    resizeCallbacks = [];
    stubSize();
    (global as any).ResizeObserver = class {
        constructor(cb: () => void) {
            resizeCallbacks.push(cb);
        }
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    __setEchartsRuntimeForTest(runtime);
});

const OPTION_A = { series: [{ type: 'line', data: [1] }] };
const OPTION_B = { series: [{ type: 'line', data: [2] }] };

it('creates one instance and writes the option', () => {
    render(<EChart option={OPTION_A} lazyUpdate />);

    expect(init).toHaveBeenCalledTimes(1);
    expect(setOption).toHaveBeenCalledWith(OPTION_A, { notMerge: undefined, lazyUpdate: true });
});

it('a fresh onEvents object on every render does not recreate the chart', () => {
    // This is the regression echarts-for-react had: it deep-compared onEvents, handlers are new
    // closures each render, so it disposed and rebuilt the whole chart — invalidating the instance
    // the caller captured in onChartReady.
    const view = render(<EChart option={OPTION_A} onEvents={{ click: () => undefined }} />);
    expect(init).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 3; i += 1) {
        act(() => {
            view.rerender(<EChart option={OPTION_A} onEvents={{ click: () => undefined }} />);
        });
    }

    expect(init).toHaveBeenCalledTimes(1);
    expect(dispose).not.toHaveBeenCalled();
    expect(on).toHaveBeenCalledTimes(1);
});

it('dispatches to the handler the caller passed most recently', () => {
    const first = jest.fn();
    const second = jest.fn();
    const view = render(<EChart option={OPTION_A} onEvents={{ click: first }} />);

    act(() => {
        view.rerender(<EChart option={OPTION_A} onEvents={{ click: second }} />);
    });

    const bound = on.mock.calls[0][1] as (payload: unknown) => void;
    bound({ kind: 'click' });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ kind: 'click' });
});

it('rebinds when the set of event names changes', () => {
    const view = render(<EChart option={OPTION_A} onEvents={{ click: () => undefined }} />);
    expect(on).toHaveBeenCalledTimes(1);

    act(() => {
        view.rerender(
            <EChart option={OPTION_A} onEvents={{ click: () => undefined, datazoom: () => undefined }} />
        );
    });

    expect(off).toHaveBeenCalledTimes(1);
    expect(on).toHaveBeenCalledTimes(3); // click + (click, datazoom)
});

it('writes the option again when it changes', () => {
    const view = render(<EChart option={OPTION_A} notMerge lazyUpdate />);
    setOption.mockClear();

    act(() => {
        view.rerender(<EChart option={OPTION_B} notMerge lazyUpdate />);
    });

    expect(setOption).toHaveBeenCalledWith(OPTION_B, { notMerge: true, lazyUpdate: true });
});

it('resizes with its container', () => {
    // The tag analyzer never calls resize() itself — it relied on echarts-for-react's size-sensor,
    // so losing this silently would leave charts the wrong size after a panel drag.
    render(<EChart option={OPTION_A} />);
    expect(resize).not.toHaveBeenCalled();

    act(() => resizeCallbacks.forEach((cb) => cb()));

    expect(resize).toHaveBeenCalledTimes(1);
});

it('hands the instance over once it is configured, and disposes on unmount', () => {
    const onChartReady = jest.fn();
    const view = render(<EChart option={OPTION_A} onChartReady={onChartReady} />);

    expect(onChartReady).toHaveBeenCalledTimes(1);
    // The caller drives the chart imperatively from here, so the option must already be on it.
    expect(setOption).toHaveBeenCalled();

    view.unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
});

it('renders nothing until the runtime arrives', () => {
    __setEchartsRuntimeForTest(undefined);
    const { container } = render(<EChart option={OPTION_A} />);

    expect(container.firstChild).toBeNull();
    expect(init).not.toHaveBeenCalled();
});

it('forwards data-testid to the element the chart is created on', () => {
    const { getByTestId } = render(<EChart option={OPTION_A} data-testid="viewport-surface" />);
    const host = getByTestId('viewport-surface');
    expect(init).toHaveBeenCalledWith(host, undefined, undefined);
});
