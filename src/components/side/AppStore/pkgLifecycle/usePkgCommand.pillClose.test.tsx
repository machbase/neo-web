// A SUCCESSFUL UNINSTALL TAKES THE PILL WITH IT (spec §2).
//
// The package view onto an uninstalled package is a dead end — its cgi-bin is
// gone, so the tree can only report "No hierarchy items" and every switch in it
// is disabled. The cleanup lives in this hook rather than on the Uninstall button
// because uninstall is reachable from BOTH the catalog card and the detail tab,
// and this callback is the single path they share.
//
// Everything below the hook is stubbed, exactly as in usePkgCommand.warnings —
// the subject is the two atom writes, not the lifecycle steps.

import { renderHook, act } from '@testing-library/react';
import { RecoilRoot, useRecoilValue, useSetRecoilState, type MutableSnapshot } from 'recoil';
import type { ReactNode } from 'react';
import { usePkgCommand } from './usePkgCommand';
import { runUninstall } from '.';
import { gActivePkgView, gOpenPkgViews } from '@/recoil/appStore';

jest.mock('../catalog', () => ({
    buildCatalog: jest.fn(async () => ({ pkgs: [], mode: 'online', hubError: undefined, lastSyncAt: 1, scanWarnings: [] })),
    listInstalledNames: jest.fn(async () => new Set<string>()),
    installedIconOf: jest.fn(() => undefined),
}));
jest.mock('.', () => ({
    checkPkgHealth: jest.fn(async () => ({ reachable: false, running: false, status: 'unknown' })),
    readManifest: jest.fn(async () => null),
    runInstall: jest.fn(async () => ({ ok: true, log: '' })),
    runUpdate: jest.fn(async () => ({ ok: true, log: '' })),
    runUninstall: jest.fn(async () => ({ ok: true, log: '' })),
    runStart: jest.fn(async () => ({ ok: true, log: '' })),
    runStop: jest.fn(async () => ({ ok: true, log: '' })),
}));
jest.mock('@/api/repository/onpremCatalog', () => ({
    getInstalledIcons: jest.fn(() => undefined),
    invalidateLocalArchiveCache: jest.fn(),
}));
jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn(async () => ({ data: { children: [] } })) }));
jest.mock('@/utils/fileTreeParser', () => ({ fileTreeParser: jest.fn(() => []) }));
jest.mock('@/utils', () => ({ ...jest.requireActual('@/utils'), isCurUserEqualAdmin: jest.fn(() => true) }));
jest.mock('@/hooks/useExperiment', () => ({ useExperiment: () => ({ getExperiment: () => false }) }));
jest.mock('@/components/mainContent/tabCloseUtils', () => ({ closeTabState: jest.fn(() => ({ nextBoardList: [], nextSelectedTabId: '' })) }));
jest.mock('@/design-system/components', () => ({
    Toast: { warning: jest.fn(), success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const appNamed = (name: string): any => ({ name, latest_version: '1.0.0', github: { full_name: `machbase/${name}` } });

const renderCommand = (open: string[], active: string | null) => {
    const init = ({ set }: MutableSnapshot) => {
        set(gOpenPkgViews, open);
        set(gActivePkgView, active);
    };
    const wrapper = ({ children }: { children: ReactNode }) => <RecoilRoot initializeState={init}>{children}</RecoilRoot>;
    return renderHook(
        () => ({
            run: usePkgCommand(),
            openViews: useRecoilValue(gOpenPkgViews),
            activeView: useRecoilValue(gActivePkgView),
            setOpen: useSetRecoilState(gOpenPkgViews),
        }),
        { wrapper }
    );
};

beforeEach(() => jest.clearAllMocks());

test('uninstalling the package the panel is showing closes its pill and returns to the catalog', async () => {
    const { result } = renderCommand(['neo-pkg-a', 'neo-pkg-b'], 'neo-pkg-b');

    await act(async () => {
        await result.current.run(appNamed('neo-pkg-b'), 'uninstall');
    });

    expect(result.current.openViews).toEqual(['neo-pkg-a']);
    expect(result.current.activeView).toBeNull();
});

test('uninstalling a package that is open in the BACKGROUND does not move the view', async () => {
    const { result } = renderCommand(['neo-pkg-a', 'neo-pkg-b'], 'neo-pkg-a');

    await act(async () => {
        await result.current.run(appNamed('neo-pkg-b'), 'uninstall');
    });

    expect(result.current.openViews).toEqual(['neo-pkg-a']);
    expect(result.current.activeView).toBe('neo-pkg-a');
});

test('uninstalling a package with no pill leaves the switcher untouched', async () => {
    const { result } = renderCommand(['neo-pkg-a'], 'neo-pkg-a');

    await act(async () => {
        await result.current.run(appNamed('neo-pkg-zzz'), 'uninstall');
    });

    expect(result.current.openViews).toEqual(['neo-pkg-a']);
    expect(result.current.activeView).toBe('neo-pkg-a');
});

// A FAILED UNINSTALL LEAVES THE PACKAGE INSTALLED, so its view is still valid —
// closing the pill would hide a package the user still has and still has to deal
// with.
test('a failed uninstall keeps the pill open', async () => {
    (runUninstall as jest.Mock).mockResolvedValueOnce({ ok: false, reason: 'script exited 1', log: '' });
    const { result } = renderCommand(['neo-pkg-b'], 'neo-pkg-b');

    await act(async () => {
        await result.current.run(appNamed('neo-pkg-b'), 'uninstall');
    });

    expect(result.current.openViews).toEqual(['neo-pkg-b']);
    expect(result.current.activeView).toBe('neo-pkg-b');
});

// The other commands must not touch the switcher: stopping a package is not a
// reason to close the view you were using to stop it.
test.each(['start', 'stop', 'install', 'update'] as const)('%s leaves the pill alone', async (command) => {
    const { result } = renderCommand(['neo-pkg-b'], 'neo-pkg-b');

    await act(async () => {
        await result.current.run(appNamed('neo-pkg-b'), command);
    });

    expect(result.current.openViews).toEqual(['neo-pkg-b']);
    expect(result.current.activeView).toBe('neo-pkg-b');
});
