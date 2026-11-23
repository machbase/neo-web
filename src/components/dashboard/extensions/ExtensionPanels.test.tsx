import { act, render, screen, waitFor } from '@testing-library/react';
import { PanelExtensionProvider, useExtensionEntries, usePanelExtension } from './ExtensionPanels';
import { listPanelExtensions, loadPanelExtension } from './registry';
import { PANEL_EXTENSIONS_CHANGED } from '@/components/side/AppStore/pkgLifecycle/panelPackageScript';
import type { ExtensionDefinition, ExtensionEntry } from './types';
jest.mock('./registry', () => ({ listPanelExtensions: jest.fn(), loadPanelExtension: jest.fn() }));
jest.mock('./HostReact', () => ({ useExtensionHost: jest.fn() }));
const entry: ExtensionEntry = { packageId: 'example/player', typeId: 'video', label: 'Video', contractVersion: 1, revision: 'installed-1', moduleId: 3 };
const definition: ExtensionDefinition = { typeId: 'video', label: 'Video', settingsVersion: 1, defaults: {}, View: () => null };
function Selected({ typeId }: { typeId: string }) {
    const result = usePanelExtension(entry.packageId, typeId);
    return <div data-testid={typeId}>{result.error ?? result.definition?.label ?? 'loading'}</div>;
}
function Installed() { return <pre data-testid="installed">{JSON.stringify(useExtensionEntries())}</pre>; }
function refresh() { act(() => { window.dispatchEvent(new Event(PANEL_EXTENSIONS_CHANGED)); }); }
beforeEach(() => { jest.clearAllMocks(); });

it('shares a registered module between panel types and preserves it on an unchanged refresh', async () => {
    const other = { ...entry, typeId: 'events', label: 'Events' };
    jest.mocked(listPanelExtensions).mockImplementation(async () => [{ ...entry }, { ...other }]);
    jest.mocked(loadPanelExtension).mockResolvedValue(new Map([['video', definition], ['events', { ...definition, typeId: 'events', label: 'Events' }]]));
    render(<PanelExtensionProvider enabled><Selected typeId="video" /><Selected typeId="events" /></PanelExtensionProvider>);
    await waitFor(() => expect(screen.getByTestId('video')).toHaveTextContent('Video'));
    expect(screen.getByTestId('events')).toHaveTextContent('Events');
    expect(loadPanelExtension).toHaveBeenCalledTimes(1);
    refresh();
    await waitFor(() => expect(listPanelExtensions).toHaveBeenCalledTimes(2));
    expect(loadPanelExtension).toHaveBeenCalledTimes(1);
});

it('replaces a changed installation and reports an unregistered panel', async () => {
    jest.mocked(listPanelExtensions).mockResolvedValue([entry]);
    jest.mocked(loadPanelExtension).mockResolvedValue(new Map([['video', definition]]));
    render(<PanelExtensionProvider enabled><Selected typeId={entry.typeId} /><Installed /></PanelExtensionProvider>);
    await waitFor(() => expect(screen.getByTestId('video')).toHaveTextContent('Video'));
    const updated = { ...entry, revision: 'installed-2', label: 'Updated video' };
    jest.mocked(listPanelExtensions).mockResolvedValue([updated]);
    jest.mocked(loadPanelExtension).mockResolvedValue(new Map([['video', { ...definition, label: 'Updated video' }]]));
    refresh();
    await waitFor(() => expect(screen.getByTestId('video')).toHaveTextContent('Updated video'));
    expect(loadPanelExtension).toHaveBeenLastCalledWith(updated, [updated]);
    jest.mocked(listPanelExtensions).mockResolvedValue([]);
    refresh();
    await waitFor(() => expect(screen.getByTestId('video')).toHaveTextContent('unavailable'));
    expect(screen.getByTestId('installed')).toHaveTextContent('[]');
});

it('retries a failed shared module on an unchanged registry refresh without automatically retrying', async () => {
    const other = { ...entry, typeId: 'events', label: 'Events' };
    jest.mocked(listPanelExtensions).mockImplementation(async () => [{ ...entry }, { ...other }]);
    jest.mocked(loadPanelExtension).mockRejectedValueOnce(new Error('Temporary network failure'));
    render(<PanelExtensionProvider enabled><Selected typeId="video" /><Selected typeId="events" /></PanelExtensionProvider>);
    await waitFor(() => expect(screen.getByTestId('video')).toHaveTextContent('Temporary network failure'));
    expect(screen.getByTestId('events')).toHaveTextContent('Temporary network failure');
    expect(loadPanelExtension).toHaveBeenCalledTimes(1);

    jest.mocked(loadPanelExtension).mockResolvedValue(new Map([
        ['video', definition], ['events', { ...definition, typeId: 'events', label: 'Events' }],
    ]));
    refresh();
    await waitFor(() => expect(screen.getByTestId('video')).toHaveTextContent('Video'));
    expect(screen.getByTestId('events')).toHaveTextContent('Events');
    expect(loadPanelExtension).toHaveBeenCalledTimes(2);
    refresh();
    await waitFor(() => expect(listPanelExtensions).toHaveBeenCalledTimes(3));
    expect(loadPanelExtension).toHaveBeenCalledTimes(2);
});

it('retries a failed module when the panel reopens within the same provider', async () => {
    jest.mocked(listPanelExtensions).mockResolvedValue([entry]);
    jest.mocked(loadPanelExtension).mockRejectedValueOnce(new Error('Temporary network failure'));
    const view = render(<PanelExtensionProvider enabled><Selected key="first" typeId="video" /></PanelExtensionProvider>);
    await waitFor(() => expect(screen.getByTestId('video')).toHaveTextContent('Temporary network failure'));

    jest.mocked(loadPanelExtension).mockResolvedValue(new Map([['video', definition]]));
    view.rerender(<PanelExtensionProvider enabled><Selected key="reopened" typeId="video" /></PanelExtensionProvider>);
    await waitFor(() => expect(screen.getByTestId('video')).toHaveTextContent('Video'));
    expect(listPanelExtensions).toHaveBeenCalledTimes(1);
    expect(loadPanelExtension).toHaveBeenCalledTimes(2);
});

it('can retry a pending shared load that fails after the registry changes', async () => {
    let rejectLoad!: (error: Error) => void;
    jest.mocked(listPanelExtensions).mockResolvedValue([entry]);
    jest.mocked(loadPanelExtension).mockReturnValueOnce(new Promise((_resolve, reject) => { rejectLoad = reject; }));
    render(<PanelExtensionProvider enabled><Selected typeId="video" /><Installed /></PanelExtensionProvider>);
    await waitFor(() => expect(loadPanelExtension).toHaveBeenCalledTimes(1));
    const renamed = { ...entry, label: 'Renamed video' };
    jest.mocked(listPanelExtensions).mockResolvedValue([renamed]);
    refresh();
    await waitFor(() => expect(screen.getByTestId('installed')).toHaveTextContent('Renamed video'));
    expect(loadPanelExtension).toHaveBeenCalledTimes(1);
    await act(async () => { rejectLoad(new Error('Delayed network failure')); });
    expect(screen.getByTestId('video')).toHaveTextContent('Delayed network failure');

    jest.mocked(loadPanelExtension).mockResolvedValue(new Map([['video', definition]]));
    refresh();
    await waitFor(() => expect(screen.getByTestId('video')).toHaveTextContent('Video'));
    expect(loadPanelExtension).toHaveBeenCalledTimes(2);
});

it('ignores an obsolete rejection after a newer installation has loaded', async () => {
    let rejectOldLoad!: (error: Error) => void;
    jest.mocked(listPanelExtensions).mockResolvedValue([entry]);
    jest.mocked(loadPanelExtension).mockReturnValueOnce(new Promise((_resolve, reject) => { rejectOldLoad = reject; }));
    render(<PanelExtensionProvider enabled><Selected typeId="video" /></PanelExtensionProvider>);
    await waitFor(() => expect(loadPanelExtension).toHaveBeenCalledTimes(1));
    jest.mocked(listPanelExtensions).mockResolvedValue([{ ...entry, revision: 'installed-2' }]);
    jest.mocked(loadPanelExtension).mockResolvedValue(new Map([['video', definition]]));
    refresh();
    await waitFor(() => expect(screen.getByTestId('video')).toHaveTextContent('Video'));
    await act(async () => { rejectOldLoad(new Error('Obsolete failure')); });
    expect(screen.getByTestId('video')).toHaveTextContent('Video');
    refresh();
    await waitFor(() => expect(listPanelExtensions).toHaveBeenCalledTimes(3));
    expect(loadPanelExtension).toHaveBeenCalledTimes(2);
});
