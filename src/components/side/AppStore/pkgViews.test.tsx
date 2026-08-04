// The invariant `pkgViews.ts` exists to hold: `gActivePkgView` is always either
// `null` or a name that is still in `gOpenPkgViews`.

import { act, render, renderHook } from '@testing-library/react';
import { RecoilRoot, useRecoilValue, type MutableSnapshot } from 'recoil';
import { gActivePkgView, gOpenPkgViews } from '@/recoil/appStore';
import { useClosePkgView, useOpenPkgView, usePkgViews } from './pkgViews';

const wrapperWith = (open: string[] = [], active: string | null = null) => {
    const init = ({ set }: MutableSnapshot) => {
        set(gOpenPkgViews, open);
        set(gActivePkgView, active);
    };
    return ({ children }: { children: React.ReactNode }) => <RecoilRoot initializeState={init}>{children}</RecoilRoot>;
};

const renderViews = (open: string[] = [], active: string | null = null) =>
    renderHook(() => usePkgViews(), { wrapper: wrapperWith(open, active) });

describe('useOpenPkgView', () => {
    test('opening an unopened package adds a pill and makes it active', () => {
        const { result } = renderViews();

        act(() => result.current.openView('a'));

        expect(result.current.openViews).toEqual(['a']);
        expect(result.current.activeView).toBe('a');
    });

    test('opening an already open package switches to it without a duplicate pill', () => {
        const { result } = renderViews(['a', 'b'], 'a');

        act(() => result.current.openView('b'));

        expect(result.current.openViews).toEqual(['a', 'b']);
        expect(result.current.activeView).toBe('b');
    });

    test('pills keep their open order — a re-open does not move one to the end', () => {
        const { result } = renderViews(['a', 'b', 'c']);

        act(() => result.current.openView('a'));

        expect(result.current.openViews).toEqual(['a', 'b', 'c']);
    });

    test('an empty name is refused rather than opening a nameless pill', () => {
        const { result } = renderViews();

        act(() => result.current.openView(''));

        expect(result.current.openViews).toEqual([]);
        expect(result.current.activeView).toBeNull();
    });
});

describe('useClosePkgView', () => {
    test('closing the ACTIVE pill falls back to the catalog', () => {
        const { result } = renderViews(['a', 'b'], 'b');

        act(() => result.current.closeView('b'));

        expect(result.current.openViews).toEqual(['a']);
        expect(result.current.activeView).toBeNull();
    });

    test('closing an INACTIVE pill leaves the view where it was', () => {
        const { result } = renderViews(['a', 'b'], 'a');

        act(() => result.current.closeView('b'));

        expect(result.current.openViews).toEqual(['a']);
        expect(result.current.activeView).toBe('a');
    });

    test('closing something that was never open changes nothing', () => {
        const { result } = renderViews(['a'], 'a');

        act(() => result.current.closeView('zzz'));

        expect(result.current.openViews).toEqual(['a']);
        expect(result.current.activeView).toBe('a');
    });

    test('closing the last pill leaves the catalog, not an empty package view', () => {
        const { result } = renderViews(['a'], 'a');

        act(() => result.current.closeView('a'));

        expect(result.current.openViews).toEqual([]);
        expect(result.current.activeView).toBeNull();
    });
});

describe('selectView', () => {
    test('null selects the catalog and keeps every pill open', () => {
        const { result } = renderViews(['a', 'b'], 'b');

        act(() => result.current.selectView(null));

        expect(result.current.activeView).toBeNull();
        expect(result.current.openViews).toEqual(['a', 'b']);
    });
});

describe('the write-only hooks do not subscribe to the open list', () => {
    // `usePkgCommand` runs inside EVERY catalog card and only ever WRITES these
    // atoms. If it read them, opening one pill would re-render the whole catalog —
    // which is the reason the three hooks are split at all.
    test('a writer-only component sits still while a reader beside it re-renders', () => {
        let writerRenders = 0;
        let readerRenders = 0;
        let openView: (name: string) => void = () => undefined;

        const Writer = () => {
            writerRenders++;
            openView = useOpenPkgView();
            useClosePkgView();
            return null;
        };
        // The control. It MUST re-render, otherwise a frozen Writer would prove
        // nothing more than that the write never landed.
        const Reader = () => {
            readerRenders++;
            return <span>{useRecoilValue(gOpenPkgViews).join(',')}</span>;
        };

        render(
            <RecoilRoot>
                <Writer />
                <Reader />
            </RecoilRoot>
        );
        const writerBefore = writerRenders;
        const readerBefore = readerRenders;

        act(() => openView('a'));

        expect(readerRenders).toBeGreaterThan(readerBefore);
        expect(writerRenders).toBe(writerBefore);
    });
});
