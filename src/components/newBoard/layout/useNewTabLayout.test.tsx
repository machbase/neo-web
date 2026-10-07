import { act, renderHook, waitFor } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import request from '@/api/core';
import { postFileList } from '@/api/repository/api';
import { getUserName } from '@/utils';
import { useNewTabLayout } from './useNewTabLayout';

jest.mock('@/api/core', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/api/repository/api', () => ({ postFileList: jest.fn() }));
jest.mock('@/utils', () => ({ getUserName: jest.fn() }));
jest.mock('@/design-system/components', () => ({ Toast: { error: jest.fn() } }));

const mockRequest = request as unknown as jest.Mock;
const mockWrite = postFileList as unknown as jest.Mock;
const mockUser = getUserName as unknown as jest.Mock;

// The server's files: SYS has saved a layout with one titled section, KEV has saved nothing.
const sFiles: Record<string, unknown> = {
    'layout.SYS.json': { version: 1, nodes: [{ id: 's', kind: 'section', title: 'SYS ONLY', size: 4, children: [] }] },
};

beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.mockImplementation(async ({ url }: { url: string }) => {
        const sName = url.split('/').pop() as string;
        return sName in sFiles ? sFiles[sName] : { status: 404, headers: {}, config: {}, data: { reason: 'no such file or directory' } };
    });
    mockWrite.mockResolvedValue({ success: true });
});

describe('useNewTabLayout across accounts', () => {
    // Logging out and in as another account keeps the page (and Recoil state); the New tab must
    // still show, and save to, the account that is signed in now.
    test('reads the signed-in account again after the account changes', async () => {
        mockUser.mockReturnValue('sys');
        const { result, rerender } = renderHook(() => useNewTabLayout(), { wrapper: RecoilRoot });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.nodes.map((aNode) => aNode.title)).toEqual(['SYS ONLY']);

        mockUser.mockReturnValue('kev');
        rerender();
        // Never SYS's layout under KEV, not even before KEV's file has been read.
        expect(result.current.nodes.map((aNode) => aNode.title)).not.toContain('SYS ONLY');
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.isDefault).toBe(true);
        expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringContaining('layout.KEV.json') }));

        await act(async () => {
            await result.current.save(result.current.nodes);
        });
        expect(mockWrite).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'layout.KEV.json');
        expect(mockWrite).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), 'layout.SYS.json');
    });
});
