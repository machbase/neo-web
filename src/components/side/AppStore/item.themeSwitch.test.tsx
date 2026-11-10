// A theme package has no service: its card shows no Start/Stop switch (it is chosen in
// Settings → Theme, per browser). Any other installed package keeps the switch.

import { render, screen } from '@testing-library/react';
import { RecoilRoot, type MutableSnapshot } from 'recoil';
import { AppItem } from './item';
import { gCatalogStatus, gServerVersion } from '@/recoil/appStore';

jest.mock('@/api/repository/appStore', () => ({}));
jest.mock('@/hooks/useExperiment', () => ({
    useExperiment: () => ({ getExperiment: () => false }),
}));
jest.mock('./pkgLifecycle/usePkgCommand', () => ({
    usePkgCommand: () => jest.fn(),
}));
jest.mock('@/utils', () => ({
    ...jest.requireActual('@/utils'),
    isCurUserEqualAdmin: jest.fn(() => true),
}));

const renderItem = (app: any) => {
    const init = ({ set }: MutableSnapshot) => {
        set(gServerVersion, '8.7.2');
        set(gCatalogStatus, { mode: 'offline' });
    };
    return render(
        <RecoilRoot initializeState={init}>
            <AppItem pItem={app} />
        </RecoilRoot>
    );
};

const installed = (extra: object) => ({
    name: 'neo-pkg-x',
    github: { organization: 'machbase', description: 'x' },
    installed_frontend: true,
    installed_version: '1.0.0',
    versions: [{ version: '1.0.0', minServer: '8.0.0', source: 'local' }],
    ...extra,
});

test('an installed theme package: no run switch', () => {
    renderItem(installed({ name: 'neo-pkg-theme-light', installed_theme: true }));
    expect(screen.queryByTitle(/^(Start|Stop)$/)).toBeNull();
});

test('any other installed package keeps its run switch', () => {
    renderItem(installed({}));
    expect(screen.getByTitle('Start')).toBeInTheDocument();
});
