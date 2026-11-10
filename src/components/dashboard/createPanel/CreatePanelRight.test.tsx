import { fireEvent, render, screen } from '@testing-library/react';
import { getFiles } from '@/api/repository/fileTree';
import CreatePanelRight from './CreatePanelRight';
import { PanelExtensionProvider } from '../extensions/ExtensionPanels';
import { listPanelExtensions } from '../extensions/registry';

jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn(async () => ({ data: { children: [] } })) }));
jest.mock('../extensions/registry', () => ({ listPanelExtensions: jest.fn(), loadPanelExtension: jest.fn() }));

test('shows extension options without sending the extension type to the built-in chart converter', async () => {
    render(
        <CreatePanelRight
            pPanelOption={{ id: 'panel', type: 'Extension', extension: { packageId: 'example/note', typeId: 'note' } }}
            pSetPanelOption={jest.fn()}
            pType="edit"
            pExtensionDefinition={{
                typeId: 'note',
                label: 'Note',
                settingsVersion: 1,
                defaults: {},
                View: () => null,
                Options: ({ settingErrors }) => <span>{settingErrors.schedule}</span>,
            }}
            pExtensionEditorProps={{
                settings: {},
                settingErrors: { schedule: 'Enter a date string.' },
                onSettingsChange: jest.fn(),
            }}
        />
    );
    expect(await screen.findByText('Enter a date string.')).toBeVisible();
});

test('selecting the current extension type preserves the existing draft', async () => {
    jest.mocked(listPanelExtensions).mockResolvedValue([
        { packageId: 'example/note', typeId: 'note', label: 'Note', revision: 'one', moduleId: 0, contractVersion: 1 },
    ]);
    const setPanel = jest.fn();
    render(
        <PanelExtensionProvider enabled>
            <CreatePanelRight
                pPanelOption={{ id: 'panel', type: 'Extension', extension: { packageId: 'example/note', typeId: 'note', settings: { text: 'saved' } } }}
                pSetPanelOption={setPanel}
                pType="edit"
                pExtensionEditorProps={{ settings: {}, settingErrors: {}, onSettingsChange: jest.fn() }}
            />
        </PanelExtensionProvider>
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Note' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Note' }));
    expect(setPanel).not.toHaveBeenCalled();
});

test.each(['Line', 'Bar', 'Scatter', 'Adv scatter', 'Gauge', 'Pie', 'Liquid fill', 'Text', 'Geomap', 'Tql chart', 'Video'])(
    'switching a saved extension to %s creates fresh built-in settings and keeps its layout',
    async (type) => {
        if (!globalThis.structuredClone) globalThis.structuredClone = (value: any) => JSON.parse(JSON.stringify(value));
        jest.mocked(getFiles).mockResolvedValue({ data: { children: [{ name: 'neo-pkg-blackbox', isDir: true }] } } as any);
        const previous = {
            id: 'saved-panel', title: 'Extension title', theme: 'light', type: 'Extension',
            x: 3, y: 5, w: 8, h: 6,
            extension: { packageId: 'example/note', typeId: 'note', settings: { text: 'saved' } },
            timeRange: { start: 'old-start', end: 'old-end', refresh: '1s' },
            chartOptions: { oldExtensionState: true },
        };
        const before = JSON.stringify(previous);
        let next: any;
        render(
            <CreatePanelRight
                pPanelOption={previous}
                pSetPanelOption={(update: any) => { next = typeof update === 'function' ? update(previous) : update; }}
                pType="edit"
                pExtensionEditorProps={{ settings: previous.extension.settings, settingErrors: {}, onSettingsChange: jest.fn() }}
            />
        );
        const errors: unknown[] = [];
        const capture = (event: ErrorEvent) => { errors.push(event.error); event.preventDefault(); };
        window.addEventListener('error', capture);
        try {
            fireEvent.click(await screen.findByRole('button', { name: 'Unavailable extension' }));
            fireEvent.click(await screen.findByRole('option', { name: type }));
            expect(errors).toEqual([]);
            expect(next).toMatchObject({ id: previous.id, type, x: 3, y: 5, w: 8, h: 6, title: 'New chart', theme: 'dark' });
            expect(Array.isArray(next.blockList)).toBe(true);
            expect(next.timeRange).toEqual({ start: '', end: '', refresh: 'Off' });
            expect(next.chartOptions.oldExtensionState).toBeUndefined();
            expect(next.extension).toBeUndefined();
            expect(next.extensionPending).toBeUndefined();
            expect(JSON.stringify(previous)).toBe(before);
        } finally {
            window.removeEventListener('error', capture);
        }
    }
);

test('a fresh built-in panel picks the first table using the existing table order', async () => {
    const previous = { id: 'panel', type: 'Extension', x: 1, y: 2, w: 7, h: 5 };
    let next: any;
    render(
        <CreatePanelRight
            pPanelOption={previous}
            pSetPanelOption={(update: any) => { next = update(previous); }}
            pType="edit"
            pTableList={[[1, 'SYS', '', 'LOGS', 0], [2, 'SYS', '', 'TAGS', 6]]}
            pExtensionEditorProps={{ settings: {}, settingErrors: {}, onSettingsChange: jest.fn() }}
        />
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Unavailable extension' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Line' }));
    expect(next.blockList[0]).toMatchObject({ table: 'TAGS', type: 'tag', userName: 'SYS', tag: '' });
    expect(next.xAxisOptions[0].useBlockList).toEqual([0]);
});
