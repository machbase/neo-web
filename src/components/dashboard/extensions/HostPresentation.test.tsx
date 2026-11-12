import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { HostBoardProvider, useExtensionHost } from './HostReact';
import Panel from '../panels/Panel';
import type { ExtensionHost } from './hostTypes';
import type { ExtensionDefinition } from './types';

jest.mock('@/api/repository/api', () => ({ getFileList: jest.fn() }));
jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn() }));
jest.mock('@/utils/CheckDataCompatibility', () => ({ CheckDataCompatibility: JSON.parse }));
jest.mock('../panels/chart/LineChart', () => ({ __esModule: true, default: () => <span>Chart</span> }));
jest.mock('../panels/PanelHeader', () => ({ __esModule: true, default: () => null }));
jest.mock('./ExtensionPanels', () => ({
    ExtensionErrorBoundary: ({ children }: any) => <>{children}</>,
    ExtensionView: () => <span>Extension</span>,
}));

const definition: ExtensionDefinition = { typeId: 'note', label: 'Note', settingsVersion: 1, defaults: {}, View: () => null };
const source = { id: 'source', type: 'Extension', title: 'Note', theme: 'dark', extension: { packageId: 'example/note', typeId: 'note', settingsVersion: 1, settings: {} } };
const chart = { id: 'chart', type: 'Line', theme: 'dark', chartOptions: {} };
const input = { id: 'board', dashboard: { panels: [source, chart] } };
let host: ExtensionHost | undefined;

function Probe({ surface }: { surface: 'dashboard' | 'preview' }) {
    const bound = useExtensionHost({ panel: source, definition, surface, settings: {} });
    if (surface === 'dashboard') host = bound.host;
    return <pre data-testid={surface}>{JSON.stringify({ editing: bound.context.board.editing, active: bound.context.active })}</pre>;
}

function Contents() {
    const [editing, setEditing] = useState(false);
    const [active, setActive] = useState(true);
    return <HostBoardProvider boardInfo={input} timeRange={{ start: 1, end: 2 }} active={active} editing={editing}>
        <button onClick={() => setEditing((value) => !value)}>Edit</button>
        <button onClick={() => setActive((value) => !value)}>Tab</button>
        <Probe surface="dashboard" /><Probe surface="preview" />
        <Panel pPanelInfo={source} pBoardInfo={input} />
        <Panel pPanelInfo={chart} pBoardInfo={input} />
        <Panel pPanelInfo={chart} pBoardInfo={input} pExtensionMode="preview" pType="edit" />
    </HostBoardProvider>;
}

it('delivers board editing independently to main and preview without replacing the main host', async () => {
    host = undefined;
    render(<RecoilRoot initializeState={({ set }) => set(gBoardList, [input] as any)}><Contents /></RecoilRoot>);
    await waitFor(() => expect(host).toBeDefined());
    const originalHost = host;
    expect(JSON.parse(screen.getByTestId('dashboard').textContent!)).toEqual({ editing: false, active: true });
    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('dashboard').textContent!)).toEqual({ editing: true, active: true }));
    expect(JSON.parse(screen.getByTestId('preview').textContent!)).toEqual({ editing: true, active: true });
    expect(host).toBe(originalHost);
    fireEvent.click(screen.getByText('Tab'));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('dashboard').textContent!)).toEqual({ editing: true, active: false }));
    expect(host).toBe(originalHost);
});

it('renders and clears shared borders on native, extension and connected preview wrappers without changing saved data', async () => {
    host = undefined; const saved = JSON.stringify(input);
    const { container } = render(<RecoilRoot initializeState={({ set }) => set(gBoardList, [input] as any)}><Contents /></RecoilRoot>);
    await waitFor(() => expect(host).toBeDefined());
    let target: any; let own: any;
    act(() => {
        target = host!.panels.setBorder('chart', { color: '#123456' });
        own = host!.panels.setBorder('source', { color: '#abcdef' });
    });
    expect(target.ok).toBe(true); expect(own.ok).toBe(true);
    const wrappers = container.querySelectorAll<HTMLElement>('.panel-wrap');
    expect(wrappers).toHaveLength(3);
    expect(wrappers[0]).toHaveStyle({ borderColor: '#abcdef' });
    expect(wrappers[1]).toHaveStyle({ borderColor: '#123456' });
    expect(wrappers[2]).toHaveStyle({ borderColor: '#123456' });
    act(() => { target.value.dispose(); own.value.dispose(); });
    expect(Array.from(wrappers, (wrapper) => wrapper.style.borderColor)).toEqual(['', '', '']);
    expect(JSON.stringify(input)).toBe(saved);
});
