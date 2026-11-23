import { useEffect } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import CreatePanel from '@/components/dashboard/createPanel/CreatePanel';
import { postFileList } from '@/api/repository/api';

const fieldProps: any[] = [];
function ApiEditor(props: any) { fieldProps.push(props); useEffect(() => { props.host.settings.patch({ a: 1 }); }, []); return <pre data-testid="editor-draft">{JSON.stringify(props.settings)}</pre>; }
function NewOptions(props: any) { fieldProps.push(props); useEffect(() => { props.host.settings.patch({ b: 2 }); }, []); return <pre data-testid="options-draft">{JSON.stringify(props.settings)}</pre>; }
const mockDefinition = { contractVersion: 1, typeId: 'note', label: 'Note', settingsVersion: 1, defaults: {}, View: () => null, Editor: ApiEditor, Options: NewOptions };
jest.mock('@/components/dashboard/extensions/ExtensionPanels', () => ({ ...jest.requireActual('@/components/dashboard/extensions/ExtensionPanels'), usePanelExtension: () => ({ definition: mockDefinition }) }));
jest.mock('@/components/dashboard/extensions/registry', () => ({ listPanelExtensions: jest.fn(), loadPanelExtension: jest.fn() }));
jest.mock('@/api/repository/api', () => ({ getTableList: jest.fn(async () => undefined), postFileList: jest.fn(async () => ({ success: true })), getFileList: jest.fn() }));
jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn() }));
jest.mock('@/components/dashboard/createPanel/CreatePanelBody', () => ({ __esModule: true, default: ({ pPanelInfo }: any) => <pre data-testid="applied">{JSON.stringify(pPanelInfo.extension.settings)}</pre> }));
jest.mock('@/components/dashboard/createPanel/CreatePanelFooter', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/dashboard/createPanel/CreatePanelRight', () => ({ __esModule: true, default: (props: any) => {
    const { ExtensionFields } = jest.requireActual('@/components/dashboard/extensions/ExtensionPanels');
    return <ExtensionFields area="Options" definition={props.pExtensionDefinition} {...props.pExtensionEditorProps} />;
} }));
jest.mock('@/components/dashboard/RangeChips', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/modal/TimeRangeModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/design-system/components', () => {
    const Block = ({ children }: any) => <div>{children}</div>;
    const TextButton = ({ pText, pCallback }: any) => <button onClick={pCallback}>{pText}</button>;
    const Page = Object.assign(Block, { Header: Block, Body: Block, DpRow: Block, Divi: () => null, TextButton });
    return { Page, Pane: Block, SplitPane: Block, Button: Block, Toast: { error: jest.fn() } };
});

it.each([
    ['test/pkg', 'note', false],
    ['neo-pkg-blackbox', 'video', true],
])('saves settings for %s using the existing panel save timing', async (packageId, typeId, immediate) => {
    jest.mocked(postFileList).mockClear();
    let finishSave!: (value: any) => void;
    jest.mocked(postFileList).mockReturnValueOnce(new Promise(resolve => { finishSave = resolve; }));
    const close = jest.fn();
    const panel = { id: 'existing-panel', type: 'Extension', title: 'Keep title', x: 1, y: 2, w: 6, h: 4,
        extension: { packageId, typeId, settingsVersion: 1, settings: { keep: 7 } } };
    const preserved = { id: 'unavailable-panel', type: 'Extension', x: 9, y: 3, w: 4, h: 5, extension: { packageId: 'missing/pkg', typeId: 'legacy', settingsVersion: 99, settings: { untouched: ['keep', { unknown: true }] } } };
    const originalPanel = JSON.stringify(panel);
    function SavedPanel() {
        const [board] = useRecoilValue(gBoardList);
        return <output data-testid="saved-panel">{JSON.stringify(board.dashboard.panels[0].extension.settings)}</output>;
    }
    const board: any = { id: 'existing-board', path: '/', name: 'existing.dsh', dashboard: { panels: [panel, preserved], timeRange: { start: 1000, end: 2000 }, distanceRange: { start: '', end: '' } } };
    render(<RecoilRoot initializeState={({ set }) => set(gBoardList, [board])}><CreatePanel
        pLoopMode={false} pPanelId={panel.id} pSetCreateModal={close} pType="edit" pBoardInfo={board}
        pSetType={jest.fn()} pModifyState={{ id: '', state: false }} pSetModifyState={jest.fn()}
        pMoveTimeRange={jest.fn()} pMoveDistanceRange={jest.fn()} pSetTimeRangeModal={jest.fn()}
        pSetIsSaveModal={jest.fn()} pBoardTimeMinMax={{ min: 1000, max: 2000 }} pChartVariableId="preview"
        pResolveBoardTimeRange={jest.fn()} pSetBoardTimeMinMax={jest.fn()}
    /><SavedPanel /></RecoilRoot>);
    await waitFor(() => expect(screen.getByTestId('options-draft').textContent).toContain('"b":2'));
    fireEvent.click(screen.getByText('Apply'));
    await act(async () => { fireEvent.click(screen.getByText('Save')); });
    expect(postFileList).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(immediate ? 1 : 0);
    expect(screen.getByTestId('saved-panel').textContent).toBe(JSON.stringify(immediate ? { keep: 7, a: 1, b: 2 } : { keep: 7 }));
    await act(async () => { finishSave({ success: true }); });
    expect(close).toHaveBeenCalledTimes(1);

    const [saved, ...destination] = jest.mocked(postFileList).mock.calls.at(-1)!;
    expect(destination).toEqual(['/', 'existing.dsh']);
    expect(screen.getByTestId('saved-panel').textContent).toBe(JSON.stringify({ keep: 7, a: 1, b: 2 }));
    const savedPanels = JSON.parse(saved.savedCode).panels;
    expect(savedPanels[0].extension.settings).toEqual({ keep: 7, a: 1, b: 2 });
    expect(savedPanels[0].id).toBe(panel.id);
    expect(savedPanels[1]).toEqual(preserved);
    expect(JSON.stringify(panel)).toBe(originalPanel);
    expect(fieldProps.length).toBeGreaterThan(0);
    for (const props of fieldProps) expect(Object.keys(props).sort()).toEqual(['context', 'host', 'settingErrors', 'settings']);
});
