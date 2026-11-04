// #1576: on a server with HTTP token auth on, a shared board and a copied /db/tql link answer 401, so the
// controls that hand them out are not shown. Shown only once the server said yes; hidden while asking.

jest.mock('@/utils/shareAvailability', () => ({
    checkShareAvailable: jest.fn(),
    getKnownShareAvailable: jest.fn(() => undefined),
}));
jest.mock('@/components/monaco/MonacoEditor', () => ({ MonacoEditor: () => <div data-testid="monaco-stub" /> }));
jest.mock('@/components/worksheet/Markdown', () => ({ Markdown: () => null }));
jest.mock('@/components/tql/ShowVisualization', () => ({ ShowVisualization: () => null }));
jest.mock('@/components/dashboard/panels/Panel', () => () => null);
jest.mock('@/components/dashboard/createPanel/CreatePanel', () => () => null);
jest.mock('@/api/repository/machiot', () => ({
    getTqlChart: jest.fn(),
    fetchBlockTimeMinMax: jest.fn(),
    getRollupTableList: jest.fn(() => Promise.resolve({})),
}));

import { act, fireEvent, render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { checkShareAvailable, getKnownShareAvailable } from '@/utils/shareAvailability';
import Dashboard from '@/components/dashboard';
import Tql from '@/components/tql';
import { TextExtension } from '@/components/textExtension/TextExtension';

const mockAnswer = () => {
    let sResolve!: (aAvailable: boolean) => void;
    jest.mocked(checkShareAvailable).mockReturnValue(new Promise<boolean>((aResolve) => (sResolve = aResolve)));
    return (aAvailable: boolean) => act(async () => sResolve(aAvailable));
};

const BOARD = {
    id: 'board-1',
    type: 'dsh',
    name: 'b.dsh',
    path: '/',
    panelHeader: true,
    dashboard: { timeRange: { start: 'now-1h', end: 'now', refresh: 'Off' }, variables: [], panels: [] },
};

const renders = {
    'dashboard Share': {
        testId: 'share',
        render: () => (
            <Dashboard pDragStat={false} pInfo={BOARD} pWidth={0} pHandleSaveModalOpen={jest.fn()} pSetIsSaveModal={jest.fn()} pIsSave />
        ),
    },
    'TQL Copy link': {
        testId: 'tql-copy-link',
        render: () => <Tql pIsActiveTab pCode="" pIsSave setIsSaveModal={jest.fn()} pHandleSaveModalOpen={jest.fn()} pSetDragStat={jest.fn()} />,
    },
    'HTML Copy link': {
        testId: 'html-copy-link',
        render: () => <TextExtension pIsActiveTab pLang="html" pCode="" pHandleSaveModalOpen={jest.fn()} setIsOpenModal={jest.fn()} />,
    },
};

describe.each(Object.entries(renders))('%s', (_aName, aCase) => {
    it('is hidden while the server is asked, shown once it says yes', async () => {
        const answer = mockAnswer();
        render(<RecoilRoot>{aCase.render()}</RecoilRoot>);
        await act(async () => {});
        expect(screen.queryByTestId(aCase.testId)).toBeNull();
        await answer(true);
        expect(screen.getByTestId(aCase.testId)).toBeInTheDocument();
    });

    it('stays hidden when it says no', async () => {
        const answer = mockAnswer();
        render(<RecoilRoot>{aCase.render()}</RecoilRoot>);
        await answer(false);
        expect(screen.queryByTestId(aCase.testId)).toBeNull();
    });

    it('a screen opened after the answer starts from it without asking again', async () => {
        jest.mocked(checkShareAvailable).mockClear();
        jest.mocked(getKnownShareAvailable).mockReturnValueOnce(true);
        render(<RecoilRoot>{aCase.render()}</RecoilRoot>);
        await act(async () => {});
        expect(screen.getByTestId(aCase.testId)).toBeInTheDocument();
        expect(checkShareAvailable).not.toHaveBeenCalled();
    });
});

// HTML Run code opens the same /db/tql/<path> in a new window — a 401 page when shared links cannot work.
// A package page (/apps/...) opens from /web/apps/... and is not affected.
describe('HTML Run code', () => {
    const renderHtml = (aPath: string) =>
        render(
            <RecoilRoot
                initializeState={({ set }) => {
                    set(gBoardList, [{ id: 'tab-1', type: 'html', name: 'page.html', path: aPath, code: '' }] as any);
                    set(gSelectedTab, 'tab-1');
                }}
            >
                <TextExtension pIsActiveTab pLang="html" pCode="" pHandleSaveModalOpen={jest.fn()} setIsOpenModal={jest.fn()} />
            </RecoilRoot>
        );

    it('is off, saying why, where shared links cannot work', async () => {
        const answer = mockAnswer();
        renderHtml('/Z1576/');
        await answer(false);
        const sRun = screen.getByTestId('html-run');
        expect(sRun).toBeDisabled();
        expect(sRun).toHaveAccessibleName('Run code');
        fireEvent.mouseEnter(sRun);
        expect(await screen.findByText('Not available on this server.', undefined, { timeout: 2000 })).toBeInTheDocument();
        const sOpen = jest.spyOn(window, 'open').mockImplementation(() => null);
        fireEvent.click(sRun);
        expect(sOpen).not.toHaveBeenCalled();
        sOpen.mockRestore();
    });

    it('runs as before where shared links work, and while the server is asked', async () => {
        const answer = mockAnswer();
        renderHtml('/Z1576/');
        const sOpen = jest.spyOn(window, 'open').mockImplementation(() => null);
        expect(screen.getByTestId('html-run')).toBeEnabled();
        await answer(true);
        fireEvent.click(screen.getByTestId('html-run'));
        expect(sOpen).toHaveBeenCalledWith(window.location.origin + '/db/tql/Z1576/page.html', window.location.origin + '/db/tql/Z1576/page.html');
        sOpen.mockRestore();
    });

    it('a package page still runs where shared links cannot work', async () => {
        const answer = mockAnswer();
        renderHtml('/apps/demo/');
        await answer(false);
        const sOpen = jest.spyOn(window, 'open').mockImplementation(() => null);
        fireEvent.click(screen.getByTestId('html-run'));
        expect(sOpen).toHaveBeenCalledWith(window.location.origin + '/web/apps/demo/', window.location.origin + '/web/apps/demo/');
        sOpen.mockRestore();
    });
});
