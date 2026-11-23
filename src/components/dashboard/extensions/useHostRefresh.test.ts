import { act, renderHook } from '@testing-library/react';
import { createDashboardRangeRequests, useHostRefresh } from './useHostRefresh';

test('retains all reasons in a batch and does not repeat a manual reason on the next automatic tick', () => {
    const { result } = renderHook(() => useHostRefresh());
    act(() => {
        result.current[1]('manual');
        result.current[1]('auto');
    });
    expect(result.current[0]).toEqual({ revision: 2, reasons: ['manual', 'auto'] });
    act(() => result.current[1]('auto'));
    expect(result.current[0]).toEqual({ revision: 3, reasons: ['auto'] });
});

test('a refresh with unchanged ranges remains observable', () => {
    const { result } = renderHook(() => useHostRefresh());
    const request = result.current[1];
    act(() => request('range-change'));
    expect(result.current[0].revision).toBe(1);
    act(() => request('range-change'));
    expect(result.current[0].revision).toBe(2);
    expect(result.current[1]).toBe(request);
});

test('explicit time changes include the legacy range change in the same refresh', () => {
    const { result } = renderHook(() => useHostRefresh());
    act(() => result.current[1]('range-change', 'time-range-change'));
    expect(result.current[0]).toEqual({ revision: 1, reasons: ['range-change', 'time-range-change'] });
    act(() => result.current[1]('range-change'));
    expect(result.current[0]).toEqual({ revision: 2, reasons: ['range-change'] });
});

test('an automatic refresh cannot replace a pending user range selection', async () => {
    const update = createDashboardRangeRequests();
    let finish!: (range: string) => void;
    const apply = jest.fn();
    const pending = update(false, () => new Promise<string>(resolve => { finish = resolve; }), apply);
    const automatic = jest.fn(async () => 'automatic');
    await update(true, automatic, apply);
    expect(automatic).toHaveBeenCalledTimes(1);
    finish('selected range');
    await pending;
    expect(apply.mock.calls).toEqual([['automatic'], ['selected range']]);
});

test('ongoing automatic refreshes can apply results and never rewind to older data', async () => {
    const update = createDashboardRangeRequests();
    const finish: Array<(range: number) => void> = [];
    const apply = jest.fn();
    const refresh = () => update(true, () => new Promise<number>(resolve => { finish.push(resolve); }), apply);
    const first = refresh();
    const second = refresh();
    finish[0](1);
    await first;
    const third = refresh();
    finish[2](3);
    await third;
    finish[1](2);
    await second;
    expect(apply.mock.calls).toEqual([[1], [3]]);
});
