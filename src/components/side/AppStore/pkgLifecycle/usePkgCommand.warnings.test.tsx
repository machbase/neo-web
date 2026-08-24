// issue #1452 — THE SECOND CATALOG WRITER.
//
// `buildCatalog` is called from exactly two places: AppStoreSide.pkgsSearch and
// the post-command rebuild inside this hook. A feature wired into only the first
// looks complete — the panel shows the findings on mount and on every keystroke —
// and then goes stale the moment anything is installed, updated or removed, which
// is the ONE moment the archive directory and `/public/` can actually have
// changed. This suite renders the real hook and asserts the atom is written.
//
// Everything below the hook is stubbed: the point is the wiring between
// buildCatalog's result and the recoil atom, not the lifecycle steps.

import { renderHook, act } from '@testing-library/react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import type { ReactNode } from 'react';
import { usePkgCommand } from './usePkgCommand';
import { buildCatalog } from '../catalog';
import { gCatalogScanWarnings } from '@/recoil/appStore';

jest.mock('../catalog', () => ({
    buildCatalog: jest.fn(),
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
// `@/utils` is a barrel; `getId` is pulled in by `@/recoil/recoil` at module load,
// so the real exports have to stay in place around the one that is overridden.
jest.mock('@/utils', () => ({ ...jest.requireActual('@/utils'), isCurUserEqualAdmin: jest.fn(() => true) }));
jest.mock('@/hooks/useExperiment', () => ({ useExperiment: () => ({ getExperiment: () => false }) }));
jest.mock('@/components/mainContent/tabCloseUtils', () => ({ closeTabState: jest.fn(() => ({ nextBoardList: [], nextSelectedTabId: '' })) }));
jest.mock('@/design-system/components', () => ({
    Toast: { warning: jest.fn(), success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const mockBuildCatalog = buildCatalog as jest.MockedFunction<typeof buildCatalog>;

const APP: any = { name: 'neo-pkg-foo', latest_version: '1.0.0', github: { full_name: 'machbase/neo-pkg-foo' } };

const wrapper = ({ children }: { children: ReactNode }) => <RecoilRoot>{children}</RecoilRoot>;

/** Renders the hook next to a reader of the atom it is supposed to write. */
const renderCommand = () => renderHook(() => ({ run: usePkgCommand(), warnings: useRecoilValue(gCatalogScanWarnings) }), { wrapper });

const catalogResult = (scanWarnings: { archive: string; error: string }[]) => ({
    pkgs: [],
    mode: 'online' as const,
    hubError: undefined,
    lastSyncAt: 1,
    scanWarnings,
});

beforeEach(() => jest.clearAllMocks());

test('the post-command rebuild publishes the scan findings, so a command cannot leave them stale', async () => {
    const warning = {
        archive: 'neo-pkg-foo-main',
        error: '"neo-pkg-foo-main" contains package "neo-pkg-foo" — looks manually extracted. Remove it and install through the App Store so the install script runs.',
    };
    mockBuildCatalog.mockResolvedValue(catalogResult([warning]));

    const { result } = renderCommand();
    expect(result.current.warnings).toEqual([]);

    await act(async () => {
        await result.current.run(APP, 'install');
    });

    expect(mockBuildCatalog).toHaveBeenCalledTimes(1);
    expect(result.current.warnings).toEqual([warning]);
});

// The clearing direction matters just as much: an uninstall that removes the
// hand-extracted directory has to take its accusation off the screen with it.
test('a rebuild that finds nothing wrong clears previously shown findings', async () => {
    mockBuildCatalog.mockResolvedValueOnce(catalogResult([{ archive: 'stage', error: 'looks manually extracted' }]));
    const { result } = renderCommand();

    await act(async () => {
        await result.current.run(APP, 'install');
    });
    expect(result.current.warnings).toHaveLength(1);

    mockBuildCatalog.mockResolvedValueOnce(catalogResult([]));
    await act(async () => {
        await result.current.run(APP, 'uninstall');
    });
    expect(result.current.warnings).toEqual([]);
});
