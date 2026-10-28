// issue #1570 F-29 — after a subscriber is created the bridge list is read again. When that
// read fails the side tree used to be blanked (server error) or replaced by an empty
// "successful" list (network failure); it must keep what it shows and say the refresh failed.

import { render, screen, fireEvent, act } from '@testing-library/react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { CreateSubr } from './createSubr';
import { genSubr, getBridge, getSubr } from '@/api/repository/bridge';
import { Toast } from '@/design-system/components';
import { gBridgeList } from '@/recoil/recoil';

jest.mock('@/api/repository/bridge', () => ({
    ...jest.requireActual('@/api/repository/bridge'),
    genSubr: jest.fn(),
    getBridge: jest.fn(),
    getSubr: jest.fn(),
}));
jest.mock('@/design-system/components/Toast', () => ({
    Toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
}));
jest.mock('@/components/buttons/SelectFileBtn', () => ({ SelectFileBtn: () => null }));
jest.mock('@/components/buttons/OpenFileBtn', () => ({ OpenFileBtn: () => null }));

const TREE = [{ name: 'mq', type: 'mqtt', path: 'broker=127.0.0.1:1883', childs: [{ id: 1, name: 'old-subr' }] }];

let sTree: any[] = [];
const Spy = () => {
    sTree = useRecoilValue<any[]>(gBridgeList);
    return null;
};

const create = async () => {
    render(
        <RecoilRoot initializeState={({ set }) => set(gBridgeList, TREE as any)}>
            <CreateSubr pInit={{ bridge: TREE[0], subr: {} }} />
            <Spy />
        </RecoilRoot>
    );
    await act(async () => {
        fireEvent.click(screen.getByText('Create'));
    });
};

beforeEach(() => {
    jest.clearAllMocks();
    (genSubr as jest.Mock).mockResolvedValue({ success: true, reason: 'success', elapse: '', id: 9 });
    (getSubr as jest.Mock).mockResolvedValue({ success: true, data: [] });
});

test('a failed bridge list re-read keeps the tree and reports the failure', async () => {
    (getBridge as jest.Mock).mockResolvedValue({ success: false, reason: 'Network Error', elapse: '', data: [] });
    await create();

    expect(sTree).toBe(TREE);
    expect(Toast.error).toHaveBeenCalledWith('Network Error', expect.objectContaining({ id: 'bridge-list' }));
});
