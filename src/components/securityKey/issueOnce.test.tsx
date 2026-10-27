// issue #1570 F-149 — a double click on "Issue token" / "Generate certificate" sent two
// requests: two secrets were issued and only the second could ever be read again. While a
// request is in flight the button must not send another.

import { render, screen, fireEvent, act } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { CreateToken } from './createToken';
import { CreateKey } from './createKey';
import { genApiToken, getApiTokens } from '@/api/repository/token';
import { genKey, getKeyList } from '@/api/repository/key';

jest.mock('@/api/repository/token', () => ({ ...jest.requireActual('@/api/repository/token'), genApiToken: jest.fn(), getApiTokens: jest.fn() }));
jest.mock('@/api/repository/key', () => ({ ...jest.requireActual('@/api/repository/key'), genKey: jest.fn(), getKeyList: jest.fn() }));
jest.mock('@/design-system/components/Toast', () => ({
    Toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
}));

const pending = () => {
    let resolve: (v: any) => void = () => {};
    const p = new Promise((r) => (resolve = r));
    return { p, resolve: (v: any) => resolve(v) };
};

const type = (aTestId: string, aValue: string) => {
    const sEl = screen.getByTestId(aTestId);
    fireEvent.change(sEl.tagName === 'INPUT' ? sEl : (sEl.querySelector('input') as HTMLElement), { target: { value: aValue } });
};

beforeEach(() => jest.clearAllMocks());

test('Issue token: a double click issues one token', async () => {
    const sCall = pending();
    (genApiToken as jest.Mock).mockReturnValue(sCall.p);
    (getApiTokens as jest.Mock).mockResolvedValue({ success: true, data: [] });
    render(
        <RecoilRoot>
            <CreateToken />
        </RecoilRoot>
    );
    type('token-name', 'ci');
    fireEvent.click(screen.getByTestId('token-create-submit'));
    fireEvent.click(screen.getByTestId('token-create-submit'));
    await act(async () => sCall.resolve({ success: true, data: { id: 1, name: 'ci', token: 'secret' } }));

    expect(genApiToken).toHaveBeenCalledTimes(1);
    // and the button works again afterwards
    fireEvent.click(screen.getByTestId('token-create-submit'));
    expect(genApiToken).toHaveBeenCalledTimes(2);
});

test('Generate certificate: a double click generates one certificate', async () => {
    const sCall = pending();
    (genKey as jest.Mock).mockReturnValue(sCall.p);
    (getKeyList as jest.Mock).mockResolvedValue({ success: true, data: [] });
    render(
        <RecoilRoot>
            <CreateKey />
        </RecoilRoot>
    );
    type('certificate-name', 'edge1');
    fireEvent.click(screen.getByTestId('certificate-create-submit'));
    fireEvent.click(screen.getByTestId('certificate-create-submit'));
    await act(async () => sCall.resolve({ success: true, name: 'edge1' }));

    expect(genKey).toHaveBeenCalledTimes(1);
});
