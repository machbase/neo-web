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

import { act, render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
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
