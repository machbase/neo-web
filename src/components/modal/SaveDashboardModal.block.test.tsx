// #1565: Save to tql with Output DATA saved the first series whatever Block showed, and the Block
// field was blank right after switching to DATA (`namne`).

import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { SaveDashboardModal } from './SaveDashboardModal';
import { getFileList, postFileList } from '@/api/repository/api';
import { getFiles } from '@/api/repository/fileTree';

jest.mock('@/api/repository/api', () => ({
    getFileList: jest.fn(),
    postFileList: jest.fn(),
}));
jest.mock('@/api/repository/fileTree', () => ({
    getFiles: jest.fn(),
    deleteFile: jest.fn(),
}));
jest.mock('@/api/repository/machiot', () => ({ fetchBlockTimeMinMax: jest.fn() }));
jest.mock('@/utils/DashboardQueryParser', () => ({
    DashboardQueryParser: jest.fn(() => [
        [{ sql: 'SELECT first' }, { sql: 'SELECT second' }],
        [{ name: 'first(avg)' }, { name: 'second(avg)' }],
        '',
    ]),
    SqlResDataType: jest.fn(() => 'TIME_VALUE'),
}));
jest.mock('@/utils/DashboardChartOptionParser', () => ({ DashboardChartOptionParser: jest.fn(() => ({})) }));
jest.mock('@/utils/DashboardChartCodeParser', () => ({ DashboardChartCodeParser: jest.fn(() => '') }));
jest.mock('@/utils/eChartHelper', () => ({ chartTypeConverter: jest.fn(() => 'line') }));

const PANEL = { title: 'X', w: 10, h: 10, type: 'Line', blockList: [{}, {}], transformBlockList: [], xAxisOptions: [], yAxisOptions: [], chartOptions: {}, theme: 'dark', isAxisInterval: false, plg: '', useCustomTime: false };

const pick = async (aTrigger: string, aMenu: string, aOption: string) => {
    fireEvent.click(screen.getByTestId(aTrigger));
    fireEvent.click(within(await screen.findByTestId(aMenu)).getByText(aOption, { exact: true }));
};

const savedScript = async () => {
    await act(async () => {
        fireEvent.click(screen.getByTestId('ok'));
    });
    return String((postFileList as jest.Mock).mock.calls[0]?.[0] ?? '');
};

describe('SaveDashboardModal — Save to tql block', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getFileList as jest.Mock).mockResolvedValue({ success: true, data: { children: [] } });
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: [] } });
        (postFileList as jest.Mock).mockResolvedValue({ success: true });
        render(
            <RecoilRoot>
                <SaveDashboardModal setIsOpen={jest.fn()} pPanelInfo={PANEL} pDashboardTime={{ start: '1000', end: '2000' }} />
            </RecoilRoot>
        );
    });

    it('shows the first series once Output is DATA', async () => {
        await screen.findByDisplayValue('X.tql');
        await pick('output', 'dashboard-save-tql-output-menu', 'DATA(JSON)');
        expect(screen.getByTestId('block')).toHaveTextContent('first(avg)');
    });

    it('saves the series picked in Block', async () => {
        await screen.findByDisplayValue('X.tql');
        await pick('output', 'dashboard-save-tql-output-menu', 'DATA(JSON)');
        await pick('block', 'dashboard-save-tql-block-menu', 'second(avg)');
        const sScript = await savedScript();
        expect(sScript).toContain('SELECT second');
        expect(sScript).not.toContain('SELECT first');
    });

    it('saves the first series when Block is left as it is', async () => {
        await screen.findByDisplayValue('X.tql');
        await pick('output', 'dashboard-save-tql-output-menu', 'DATA(CSV)');
        expect(await savedScript()).toContain('SELECT first');
    });
});
