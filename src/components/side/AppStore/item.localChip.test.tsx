// issue #1452 — the catalog card must say up front that its default button will
// install from the server's local archive, without the user opening the version
// menu first.

import { render, screen } from '@testing-library/react';
import { RecoilRoot, type MutableSnapshot } from 'recoil';
import { AppItem } from './item';
import { gCatalogStatus, gServerVersion, type CatalogMode } from '@/recoil/appStore';

jest.mock('@/api/repository/appStore', () => ({
    isGrandfatheredPkg: jest.fn(() => false),
}));
jest.mock('@/hooks/useExperiment', () => ({
    useExperiment: () => ({ getExperiment: () => false }),
}));
jest.mock('./pkgLifecycle/usePkgCommand', () => ({
    usePkgCommand: () => jest.fn(),
}));

const GITHUB = { organization: 'machbase', description: 'demo package' };

const renderItem = (app: any, mode: CatalogMode = 'online') => {
    const init = ({ set }: MutableSnapshot) => {
        set(gServerVersion, '8.0.45');
        set(gCatalogStatus, { mode });
    };
    return render(
        <RecoilRoot initializeState={init}>
            <AppItem pItem={app} />
        </RecoilRoot>
    );
};

test('update target sitting in the local archive ⇒ the card shows the local chip', () => {
    renderItem({
        name: 'neo-pkg-demo',
        github: GITHUB,
        installed_frontend: true,
        installed_version: '1.1.0',
        versions: [
            { version: '1.2.0', minServer: '8.0.10', source: 'local' },
            { version: '1.1.0', minServer: '8.0.10', source: 'local' },
        ],
    });

    expect(screen.getByText('local')).toBeInTheDocument();
});

test('update target that can only come from the hub ⇒ no local chip', () => {
    renderItem({
        name: 'neo-pkg-demo',
        github: GITHUB,
        installed_frontend: true,
        installed_version: '1.1.0',
        versions: [
            { version: '1.3.0', minServer: '8.0.10', source: 'hub' },
            { version: '1.1.0', minServer: '8.0.10', source: 'local' },
        ],
    });

    expect(screen.queryByText('local')).not.toBeInTheDocument();
});

const MIXED_SOURCES = {
    name: 'neo-pkg-demo',
    github: GITHUB,
    installed_frontend: true,
    installed_version: '1.1.0',
    versions: [
        { version: '1.3.0', minServer: '8.0.10', source: 'hub' },
        { version: '1.2.0', minServer: '8.0.10', source: 'local' },
        { version: '1.1.0', minServer: '8.0.10', source: 'local' },
    ],
};

test('offline masks the hub target away, so the surviving local target lights the chip', () => {
    renderItem(MIXED_SOURCES, 'offline');

    expect(screen.getByText('local')).toBeInTheDocument();
    // the button now targets the archived 1.2.0, not the unreachable hub 1.3.0
    expect(screen.getByText('↑v1.2.0')).toBeInTheDocument();
});

// issue #1452 — local-only is a THIRD mode, and the masking must treat it exactly
// like offline: a hub row has no bytes on this machine either way. This is the
// case that would regress if any consumer read the mode as a truthy "not offline".
test('local-only masks hub rows just as offline does', () => {
    renderItem(MIXED_SOURCES, 'localOnly');

    expect(screen.getByText('local')).toBeInTheDocument();
    expect(screen.getByText('↑v1.2.0')).toBeInTheDocument();
    expect(screen.queryByText('↑v1.3.0')).not.toBeInTheDocument();
});

// The mirror case: with the hub row the ONLY update, local-only must leave no
// update affordance at all rather than one that cannot be fulfilled.
test('local-only with a hub-only update offers no update button', () => {
    renderItem(
        {
            name: 'neo-pkg-demo',
            github: GITHUB,
            installed_frontend: true,
            installed_version: '1.1.0',
            versions: [
                { version: '1.3.0', minServer: '8.0.10', source: 'hub' },
                { version: '1.1.0', minServer: '8.0.10', source: 'local' },
            ],
        },
        'localOnly'
    );

    expect(screen.queryByText('↑v1.3.0')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument();
});
