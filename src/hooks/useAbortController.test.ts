import { act, renderHook } from '@testing-library/react';
import { useAbortController } from './useAbortController';

it('keeps the existing unkeyed latest-request behavior', () => {
    const { result } = renderHook(useAbortController);
    const older = result.current.createSignal();
    const newer = result.current.createSignal();
    expect(older.aborted).toBe(true);
    expect(newer.aborted).toBe(false);
});

it('supersedes a save only in the same tab', () => {
    const { result } = renderHook(useAbortController);
    const firstTab = result.current.createSignal('first');
    const otherTab = result.current.createSignal('other');
    const nextFirstTab = result.current.createSignal('first');
    expect(firstTab.aborted).toBe(true);
    expect(otherTab.aborted).toBe(false);
    expect(nextFirstTab.aborted).toBe(false);
});

it('finishing an old request cannot release the newer request', () => {
    const { result } = renderHook(useAbortController);
    const old = result.current.createSignal('tab');
    const newer = result.current.createSignal('tab');
    result.current.releaseSignal(old, 'tab');
    result.current.createSignal('tab');
    expect(newer.aborted).toBe(true);
});

it('releases completed requests and aborts outstanding requests on unmount', () => {
    const { result, unmount } = renderHook(useAbortController);
    const completed = result.current.createSignal('completed');
    result.current.releaseSignal(completed, 'completed');
    const first = result.current.createSignal('first');
    const second = result.current.createSignal('second');
    unmount();
    expect(completed.aborted).toBe(false);
    expect(first.aborted).toBe(true);
    expect(second.aborted).toBe(true);
});

it('explicit abort retains its existing cancel-all contract', () => {
    const { result } = renderHook(useAbortController);
    const first = result.current.createSignal('first');
    const second = result.current.createSignal();
    act(() => result.current.abort());
    expect(first.aborted).toBe(true);
    expect(second.aborted).toBe(true);
});
