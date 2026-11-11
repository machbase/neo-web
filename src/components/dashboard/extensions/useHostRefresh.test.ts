import { act, renderHook } from '@testing-library/react';
import { useHostRefresh } from './useHostRefresh';

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
