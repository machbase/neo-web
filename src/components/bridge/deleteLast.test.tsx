// issue #1570 F-142 — deleting the LAST bridge turns its tab into "BRIDGE: create" and the
// tab's code into undefined. The detail used to render once more with that undefined code
// (its own payload state lags a render behind) and crash on `pCode.name` for DB-type
// bridges, whose Command box is keyed by the name.

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { Bridge } from './index';
import { delBridge } from '@/api/repository/bridge';
import { gActiveBridge, gBoardList, gBridgeList } from '@/recoil/recoil';

jest.mock('@/api/repository/bridge', () => ({
    delBridge: jest.fn(),
    commandBridge: jest.fn(),
    addBridge: jest.fn(),
}));
jest.mock('@/design-system/components/Toast', () => ({
    Toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
}));
jest.mock('./createBridge', () => ({ CreateBridge: () => <div data-testid="bridge-create-form" /> }));

// the tab body re-reads its code from the board list, as MainContent does
const Host = () => {
    const sBoards = useRecoilValue<any[]>(gBoardList);
    return <Bridge pCode={sBoards[0].code} />;
};

const renderWith = (aList: any[]) =>
    render(
        <RecoilRoot
            initializeState={({ set }) => {
                set(gActiveBridge, aList[0].name);
                set(gBridgeList, aList);
                set(gBoardList, [{ id: 'board-1', type: 'bridge', name: `BRIDGE: ${aList[0].name}`, code: aList[0], savedCode: aList[0], path: '' }] as any);
            }}
        >
            <Host />
        </RecoilRoot>
    );

const deleteActive = async () => {
    (delBridge as jest.Mock).mockResolvedValue({ success: true, reason: 'success', elapse: '' });
    fireEvent.click(screen.getByText('Delete'));
    const sOk = await screen.findByText('OK');
    await act(async () => {
        fireEvent.click(sOk);
    });
};

describe('deleting the last bridge', () => {
    let sConsoleError: jest.SpyInstance;
    beforeEach(() => {
        jest.clearAllMocks();
        sConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => sConsoleError.mockRestore());

    test.each([
        ['SQLite', { name: 'only-db', type: 'sqlite', path: 'file:/tmp/a.db' }],
        ['MQTT', { name: 'only-mqtt', type: 'mqtt', path: 'broker=127.0.0.1:1883' }],
    ])('%s: shows the create form without a render error', async (_label, aBridge) => {
        renderWith([aBridge]);
        await deleteActive();

        await waitFor(() => expect(screen.getByTestId('bridge-create-form')).toBeInTheDocument());
        expect(screen.queryByTestId('bridge-detail')).not.toBeInTheDocument();
        const sCrash = sConsoleError.mock.calls.find((c) => String(c[0]).includes("reading 'name'") || String(c[0]?.message).includes("reading 'name'"));
        expect(sCrash).toBeUndefined();
    });

    test('with another bridge left, the tab moves to it', async () => {
        renderWith([
            { name: 'a-db', type: 'sqlite', path: 'file:/tmp/a.db' },
            { name: 'b-db', type: 'sqlite', path: 'file:/tmp/b.db' },
        ]);
        await deleteActive();

        await waitFor(() => expect(screen.getByText('b-db')).toBeInTheDocument());
        expect(screen.queryByTestId('bridge-create-form')).not.toBeInTheDocument();
    });
});
