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

it('reports pending owners until their latest request finishes or is aborted', () => {
    const { result } = renderHook(useAbortController);
    expect(result.current.hasPendingRequest('tab')).toBe(false);
    const older = result.current.createSignal('tab');
    const newer = result.current.createSignal('tab');
    result.current.releaseSignal(older, 'tab');
    expect(result.current.hasPendingRequest('tab')).toBe(true);
    result.current.releaseSignal(newer, 'tab');
    expect(result.current.hasPendingRequest('tab')).toBe(false);
    result.current.createSignal('other');
    act(() => result.current.abort());
    expect(result.current.hasPendingRequest('other')).toBe(false);
});

it('keeps a superseded successful write in the current lifetime until it finishes', () => {
    const { result } = renderHook(useAbortController);
    const older = result.current.createSignal('tab');
    const newer = result.current.createSignal('tab');
    expect(older.aborted).toBe(true);
    expect(result.current.isCurrentLifetime(older)).toBe(true);
    result.current.releaseSignal(newer, 'tab');
    expect(result.current.isCurrentLifetime(older)).toBe(true);
    result.current.releaseSignal(older, 'tab');
    expect(result.current.isCurrentLifetime(older)).toBe(false);
});

it('explicit abort invalidates both superseded and current writes, then permits a new lifetime', () => {
    const { result } = renderHook(useAbortController);
    const older = result.current.createSignal('tab');
    const newer = result.current.createSignal('tab');
    act(() => result.current.abort());
    expect(result.current.isCurrentLifetime(older)).toBe(false);
    expect(result.current.isCurrentLifetime(newer)).toBe(false);
    const next = result.current.createSignal('tab');
    expect(result.current.isCurrentLifetime(next)).toBe(true);
});

it('unmount invalidates superseded writes as well as the latest request', () => {
    const { result, unmount } = renderHook(useAbortController);
    const older = result.current.createSignal('tab');
    const newer = result.current.createSignal('tab');
    unmount();
    expect(result.current.isCurrentLifetime(older)).toBe(false);
    expect(result.current.isCurrentLifetime(newer)).toBe(false);
});
