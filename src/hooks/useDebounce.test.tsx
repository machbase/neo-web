import { act, renderHook } from '@testing-library/react';
import useDebounce from './useDebounce';
import useThrottle from './useThrottle';

// F-74: the pending call outlived its screen — a closed panel editor still sent its check and showed
// the error toast; a closed APPSTORE or meta table page still sent its search.
describe('useDebounce / useThrottle drop the pending call (F-74)', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('useDebounce: calls once, after the inputs settle', () => {
        const sCallback = jest.fn();
        const { rerender } = renderHook(({ pText }) => useDebounce([pText], sCallback, 1000), { initialProps: { pText: 'a' } });
        act(() => jest.advanceTimersByTime(500));
        rerender({ pText: 'ab' });
        act(() => jest.advanceTimersByTime(999));
        expect(sCallback).not.toHaveBeenCalled();
        act(() => jest.advanceTimersByTime(1));
        expect(sCallback).toHaveBeenCalledTimes(1);
    });

    it('useDebounce: never calls once the screen is gone', () => {
        const sCallback = jest.fn();
        const { rerender, unmount } = renderHook(({ pText }) => useDebounce([pText], sCallback, 1000), { initialProps: { pText: 'a' } });
        rerender({ pText: 'SELECT * FROM NO_SUCH_TABLE' });
        act(() => jest.advanceTimersByTime(260));
        unmount();
        act(() => jest.advanceTimersByTime(2000));
        expect(sCallback).not.toHaveBeenCalled();
    });

    it('useDebounce: the immediate mode still calls right away', () => {
        const sCallback = jest.fn();
        renderHook(() => useDebounce(['a'], sCallback, 1000, true));
        expect(sCallback).toHaveBeenCalledTimes(1);
    });

    it('useThrottle: calls after the wait, and never once the screen is gone', () => {
        const sCallback = jest.fn();
        const { unmount } = renderHook(() => useThrottle('item', sCallback, 1000));
        act(() => jest.advanceTimersByTime(1000));
        expect(sCallback).toHaveBeenCalledTimes(1);

        const sLate = jest.fn();
        const { rerender, unmount: unmountLate } = renderHook(({ pItem }) => useThrottle(pItem, sLate, 1000), { initialProps: { pItem: 'a' } });
        rerender({ pItem: 'b' });
        unmountLate();
        unmount();
        act(() => jest.advanceTimersByTime(2000));
        expect(sLate).not.toHaveBeenCalled();
    });
});
