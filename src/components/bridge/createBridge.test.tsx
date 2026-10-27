// issue #1570 F-31 — the server stores a new bridge under its lower-cased name and matches
// names case-sensitively. The list entry and the toast must use that same name, or Test and
// Delete go out as 'MyBridge' and fail with "not found" until the list is reloaded.

import { render, screen, fireEvent, act } from '@testing-library/react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { CreateBridge } from './createBridge';
import { genBridge } from '@/api/repository/bridge';
import { Toast } from '@/design-system/components';
import { gBridgeList } from '@/recoil/recoil';

jest.mock('@/api/repository/bridge', () => ({
    ...jest.requireActual('@/api/repository/bridge'),
    genBridge: jest.fn(),
}));
jest.mock('@/design-system/components/Toast', () => ({
    Toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
}));

let sList: any[] = [];
const Spy = () => {
    sList = useRecoilValue<any[]>(gBridgeList);
    return null;
};

test('a mixed-case name is listed under the name the server stored', async () => {
    (genBridge as jest.Mock).mockResolvedValue({ success: true, reason: 'success', elapse: '' });
    render(
        <RecoilRoot initializeState={({ set }) => set(gBridgeList, [])}>
            <CreateBridge />
            <Spy />
        </RecoilRoot>
    );
    fireEvent.change(screen.getByTestId('bridge-name').querySelector('input') ?? screen.getByTestId('bridge-name'), { target: { value: 'MyBridge' } });
    await act(async () => {
        fireEvent.click(screen.getByText('Create'));
    });

    expect((genBridge as jest.Mock).mock.calls[0][0].name).toBe('MyBridge');
    expect(sList.map((b) => b.name)).toEqual(['mybridge']);
    expect((Toast.success as jest.Mock).mock.calls[0][0]).toBe("Bridge 'mybridge' created");
});
