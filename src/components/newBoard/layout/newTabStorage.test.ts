// newTabStorage builds its own GET /api/files URL; it goes through the shared builder (issue-1544 r5).
import { NEW_TAB_DIR, readJsonFile } from './newTabStorage';
import request from '@/api/core';

jest.mock('@/api/core', () => ({
    __esModule: true,
    default: jest.fn(() => Promise.resolve('{"v":1}')),
}));

describe('newTabStorage readJsonFile url', () => {
    beforeEach(() => (request as unknown as jest.Mock).mockClear());

    it('reads from the hidden new-tab folder', async () => {
        const sOut = await readJsonFile('layout.A.json');
        expect((request as unknown as jest.Mock).mock.calls[0][0]).toEqual({ method: 'GET', url: `/api/files${NEW_TAB_DIR}/layout.A.json` });
        expect(sOut).toEqual({ status: 'ok', data: { v: 1 } });
    });
    it('segment-encodes the file name', async () => {
        await readJsonFile('a b#?.json');
        expect((request as unknown as jest.Mock).mock.calls[0][0].url).toBe('/api/files/.neo-web/new-tab/a%20b%23%3F.json');
    });
});
