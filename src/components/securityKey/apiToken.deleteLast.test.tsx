// issue #1570 F-187 — deleting the last API token turns the tab's code into undefined while the
// confirm dialog is still mounted; the dialog read `pCode.name` and threw (twice) on the way to
// the create form.

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { ApiToken } from './apiToken';
import { delApiToken, getApiTokens } from '@/api/repository/token';
import { gActiveToken, gBoardList, gTokenList } from '@/recoil/recoil';

jest.mock('@/api/repository/token', () => ({
    ...jest.requireActual('@/api/repository/token'),
    delApiToken: jest.fn(),
    getApiTokens: jest.fn(),
}));
jest.mock('@/design-system/components/Toast', () => ({
    Toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
}));
jest.mock('./createToken', () => ({ CreateToken: () => <div data-testid="token-create-form" /> }));

const TOKEN: any = { id: 1, name: 'ci', user: 'sys', hint: 'abcd', notBefore: '2026-01-01T00:00:00Z', notAfter: '2027-01-01T00:00:00Z' };
const TOKEN2: any = { ...TOKEN, id: 2, name: 'ci-2' };

const Host = () => {
    const sBoards = useRecoilValue<any[]>(gBoardList);
    return <ApiToken pCode={sBoards[0].code} />;
};

const renderWith = (aList: any[]) =>
    render(
        <RecoilRoot
            initializeState={({ set }) => {
                set(gActiveToken, aList[0].id);
                set(gTokenList, aList);
                set(gBoardList, [{ id: 'b', type: 'token', name: `TOKEN: ${aList[0].name}`, code: aList[0], savedCode: aList[0], path: '' }] as any);
            }}
        >
            <Host />
        </RecoilRoot>
    );

let sConsoleError: jest.SpyInstance;
beforeEach(() => {
    jest.clearAllMocks();
    sConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    (delApiToken as jest.Mock).mockResolvedValue({ success: true });
});
afterEach(() => sConsoleError.mockRestore());

const deleteActive = async () => {
    fireEvent.click(screen.getByTestId('token-delete'));
    const sOk = await screen.findByText('OK');
    await act(async () => {
        fireEvent.click(sOk);
    });
};
const nameErrors = () => sConsoleError.mock.calls.filter((c) => /reading 'name'/.test(String(c[0]?.message ?? c[0])));

test('deleting the last token shows the create form without a TypeError', async () => {
    (getApiTokens as jest.Mock).mockResolvedValue({ success: true, data: [] });
    renderWith([TOKEN]);
    await deleteActive();

    await waitFor(() => expect(screen.getByTestId('token-create-form')).toBeInTheDocument());
    expect(nameErrors()).toEqual([]);
});

test('deleting one of two tokens moves to the other', async () => {
    (getApiTokens as jest.Mock).mockResolvedValue({ success: true, data: [TOKEN2] });
    renderWith([TOKEN, TOKEN2]);
    await deleteActive();

    await waitFor(() => expect(screen.getByText('ci-2')).toBeInTheDocument());
    expect(nameErrors()).toEqual([]);
});
