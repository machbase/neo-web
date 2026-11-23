import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DashboardView from './DashboardView';

jest.mock('../panels/Panel', () => ({ __esModule: true, default: ({ pPanelInfo }: any) => <div data-testid="panel">{pPanelInfo.id}</div> }));
jest.mock('@/components/dashboard/extensions/HostReact', () => ({
    HostBoardProvider: ({ children }: any) => <>{children}</>,
}));
jest.mock('@/components/dashboard/extensions/ExtensionPanels', () => ({
    PanelExtensionProvider: ({ children }: any) => <>{children}</>,
}));
jest.mock('@/public-dashboard/api/repository/machiot', () => ({
    executeQuery: jest.fn(async () => ({ success: false })),
    fetchMountTimeMinMax: jest.fn(),
    fetchTimeMinMax: jest.fn(),
}));

const panel = (id: string, type: string) => ({ id, type, x: 0, y: 0, w: 6, h: 3, xAxisOptions: [{ type: 'time' }], yAxisOptions: [], blockList: [] });
const panels = [
    panel('linked', 'Line'),
    {
        ...panel('video + 1', 'Extension'),
        extension: { packageId: 'neo-pkg-blackbox', typeId: 'video', settingsVersion: 1, settings: { dependent: { panels: ['linked', 'missing'] } } },
    },
    panel('unrelated', 'Line'),
    { ...panel('other-extension', 'Extension'), extension: { packageId: 'another-package', typeId: 'video', settingsVersion: 1, settings: {} } },
];
const board = { dashboard: { title: 'Review Board', variables: [], panels, timeRange: { start: 1000, end: 2000, refresh: 'Off' } } };

it.each([
    ['video + 1', ['linked', 'video + 1']],
    ['missing', panels.map(({ id }) => id)],
    ['other-extension', panels.map(({ id }) => id)],
])('opens the public dashboard with video focus %s', async (id, expectedPanels) => {
    const originalFetch = globalThis.fetch;
    const contents = JSON.stringify(board);
    const fetchMock = jest.fn(async () => ({ ok: true, text: async () => contents }));
    globalThis.fetch = fetchMock as any;
    try {
        const query = new URLSearchParams({ exact: '1', video: id });
        render(
            <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/board/public/Vehicle.DSH?' + query]}>
                <Routes><Route path="/*" element={<DashboardView />} /></Routes>
            </MemoryRouter>,
        );
        await screen.findByText('Review Board');
        expect(await screen.findAllByTestId('panel')).toHaveLength(expectedPanels.length);
        expect(screen.getAllByTestId('panel').map(({ textContent }) => textContent)).toEqual(expectedPanels);
        expect(fetchMock).toHaveBeenCalledWith('/public/Vehicle.DSH');
    } finally {
        globalThis.fetch = originalFetch;
    }
});
