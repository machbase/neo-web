import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import { getFiles } from '@/api/repository/fileTree';
import { listPanelExtensions, loadPanelExtension } from '@/components/dashboard/extensions/registry';
import DashboardView from './DashboardView';

jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn() }));
jest.mock('@/components/dashboard/extensions/registry', () => ({ listPanelExtensions: jest.fn(), loadPanelExtension: jest.fn() }));
jest.mock('@/components/dashboard/panels/chart/LineChart', () => ({ __esModule: true, default: () => null }));

it('loads a saved Blackbox video inside the standalone dashboard route', async () => {
    const extension = { packageId: 'neo-pkg-blackbox', typeId: 'video', settingsVersion: 1, settings: {} };
    jest.mocked(getFiles).mockResolvedValue(JSON.stringify({
        dashboard: { title: 'Standalone board', variables: [], panels: [
            { id: 'camera', title: 'Video', type: 'Extension', extension, theme: 'dark', x: 0, y: 0, w: 6, h: 4 },
        ], timeRange: { start: 1000, end: 2000, refresh: 'Off' } },
    }) as any);
    const entry = { ...extension, label: 'Blackbox Video', revision: 'installed', contractVersion: 1, moduleId: 1 };
    jest.mocked(listPanelExtensions).mockResolvedValue([entry]);
    jest.mocked(loadPanelExtension).mockResolvedValue(new Map([['video', {
        typeId: 'video', label: 'Blackbox Video', settingsVersion: 1, defaults: {}, View: () => <span>Playback surface</span>,
    }]]));
    render(<RecoilRoot><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/view/fixture']}>
        <Routes><Route path="/view/*" element={<DashboardView />} /></Routes>
    </MemoryRouter></RecoilRoot>);
    expect(await screen.findByText('Playback surface')).toBeVisible();
    expect(screen.queryByText('Loading dashboard extension…')).toBeNull();
});
