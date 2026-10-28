// issue #1570 F-151 — a pasted public key with leading blanks, or with tabs between its fields,
// must still be registered as (type, key, title). The screen split on single spaces only, so
// the title landed in the key slot ("invalid key format") or after the key's own comment.

import { render, screen, fireEvent, act } from '@testing-library/react';
import { SSHKey } from './index';
import { rpcCall } from '@/api/repository/rpc';

jest.mock('@/api/repository/rpc', () => ({ ...jest.requireActual('@/api/repository/rpc'), rpcCall: jest.fn() }));
jest.mock('@/design-system/components/Toast', () => ({
    Toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
}));

const KEY = 'AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl';

const addWith = async (aPasted: string) => {
    (rpcCall as jest.Mock).mockImplementation(async (aMethod: string) => (aMethod === 'sshkey.list' ? { jsonrpc: '2.0', id: 1, result: [] } : { jsonrpc: '2.0', id: 1, result: null }));
    await act(async () => {
        render(<SSHKey />);
    });
    fireEvent.click(screen.getByText('New SSH key'));
    fireEvent.change(document.querySelector('input') as HTMLInputElement, { target: { value: 'laptop' } });
    fireEvent.change(document.querySelector('textarea') as HTMLTextAreaElement, { target: { value: aPasted } });
    await act(async () => {
        fireEvent.click(screen.getByText('Add SSH key'));
    });
    return (rpcCall as jest.Mock).mock.calls.find((c) => c[0] === 'sshkey.add')?.[1];
};

beforeEach(() => jest.clearAllMocks());

test.each([
    ['space separated', `ssh-ed25519 ${KEY} me@host`],
    ['leading blanks', `   ssh-ed25519 ${KEY} me@host`],
    ['leading newline', `\nssh-ed25519 ${KEY} me@host\n`],
    ['tab separated', `ssh-ed25519\t${KEY}\tme@host`],
    ['no comment, tab', `ssh-ed25519\t${KEY}`],
])('%s → (type, key, title)', async (_label, aPasted) => {
    expect(await addWith(aPasted)).toEqual(['ssh-ed25519', KEY, 'laptop']);
});
