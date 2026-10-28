// issue #1570 F-103 — a failed reference list read left an empty panel with no word of it, and a
// Quick install the server refused ({success:false, reason}) produced no toast at all.

jest.mock('@/api/repository/api', () => ({ getReferenceList: jest.fn(), postFileList: jest.fn() }));
jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn() }));
jest.mock('@/utils/UpdateTree', () => ({ TreeFetchDrilling: jest.fn(() => Promise.resolve({ tree: {} })) }));
jest.mock('@/design-system/components/Toast', () => ({ Toast: { error: jest.fn(), success: jest.fn(), info: jest.fn(), warning: jest.fn() } }));
jest.mock('./RefeList', () => ({ __esModule: true, default: ({ pValue }: any) => <div data-testid="ref-group">{pValue.label}</div> }));

import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { RecoilRoot } from 'recoil';
import { ReferenceSide } from './index';
import { fetchReferences, useQuickInstall } from './referenceActions';
import { getReferenceList, postFileList } from '@/api/repository/api';
import { getFiles } from '@/api/repository/fileTree';
import { Toast } from '@/design-system/components';

const LIST = { success: true, data: { refs: [{ label: 'REFERENCES', items: [] }, { label: 'SDK', items: [] }] } };
const NETWORK = Object.assign(new Error('Network Error'), { isAxiosError: true, name: 'AxiosError' });
const HTTP500 = { status: 500, statusText: 'Internal Server Error', headers: {}, data: { success: false, reason: 'refs unavailable' } };

beforeEach(() => jest.clearAllMocks());

describe('fetchReferences', () => {
    it.each([
        ['network failure', NETWORK, 'Network Error'],
        ['HTTP 500', HTTP500, 'refs unavailable'],
    ])('%s is an error, not an empty list', async (_label, aRes, aReason) => {
        (getReferenceList as jest.Mock).mockResolvedValue(aRes);
        await expect(fetchReferences()).rejects.toThrow(aReason);
    });
    it('a list still loads', async () => {
        (getReferenceList as jest.Mock).mockResolvedValue(LIST);
        await expect(fetchReferences()).resolves.toHaveLength(2);
    });
});

describe('ReferenceSide', () => {
    it('shows the failure with a retry that loads the list', async () => {
        (getReferenceList as jest.Mock).mockResolvedValueOnce(HTTP500).mockResolvedValue(LIST);
        await act(async () => {
            render(<ReferenceSide />);
        });
        expect(screen.getByTestId('reference-load-error')).toHaveTextContent("Couldn't load · refs unavailable");

        await act(async () => {
            fireEvent.click(screen.getByTestId('reference-load-error-retry'));
        });
        expect(screen.queryByTestId('reference-load-error')).not.toBeInTheDocument();
        expect(screen.getAllByTestId('ref-group')).toHaveLength(2);
    });
});

describe('Quick install', () => {
    const wrapper = ({ children }: { children: ReactNode }) => createElement(RecoilRoot, null, children);
    const install = async () => {
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: [] } });
        const { result } = renderHook(() => useQuickInstall(), { wrapper });
        await act(async () => {
            await result.current.install({ title: 'Tutorials', type: 'url', address: 'https://github.com/machbase/neo-tutorials' } as any);
        });
    };

    it('a refused clone tells the user why', async () => {
        (postFileList as jest.Mock).mockResolvedValue({ success: false, reason: 'authentication required: Repository not found.' });
        await install();
        expect(Toast.error).toHaveBeenCalledWith('Quick install failed: authentication required: Repository not found.');
        expect(Toast.success).not.toHaveBeenCalled();
    });

    it('a clone that succeeds still says where it went', async () => {
        (postFileList as jest.Mock).mockResolvedValue({ success: true });
        await install();
        expect(Toast.success).toHaveBeenCalledWith('Creating in neo-tutorials folder');
        expect(Toast.error).not.toHaveBeenCalled();
    });
});
