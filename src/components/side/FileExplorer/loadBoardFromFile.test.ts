import { loadBoardFromFile } from './loadBoardFromFile';
import { getFiles } from '@/api/repository/fileTree';
import { EXTENSION_SET } from '@/utils/constants';

jest.mock('@/api/repository/fileTree', () => ({
    getFiles: jest.fn(),
}));

const open = (aName: string, aContent: unknown) => {
    (getFiles as jest.Mock).mockResolvedValue(aContent);
    return loadBoardFromFile({ name: aName, path: '/d/' }, 'board-1');
};

describe('loadBoardFromFile — corrupt boards', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns {error} for a broken .dsh instead of throwing', async () => {
        const sOut = await open('x.dsh', '{broken');
        expect(sOut.error).toEqual(expect.any(String));
        expect(sOut.board).toBeUndefined();
    });

    it('returns {error} for a broken .wrk instead of throwing', async () => {
        const sOut = await open('x.wrk', '{broken');
        expect(sOut.error).toEqual(expect.any(String));
    });

    it('rejects a {} .wrk (parses, but no data array)', async () => {
        const sOut = await open('x.wrk', '{}');
        expect(sOut.error).toEqual(expect.any(String));
    });

    it('rejects a .dsh without dashboard', async () => {
        const sOut = await open('x.dsh', '{"name":"n"}');
        expect(sOut.error).toEqual(expect.any(String));
    });

    it('marks content errors as invalid (exists but damaged), not as missing', async () => {
        for (const [sName, sText] of [
            ['x.dsh', '{broken'],
            ['x.wrk', '{broken'],
            ['x.wrk', '{}'],
            ['x.dsh', '{"name":"n"}'],
            ['x.taz', '{broken'],
        ]) {
            const sOut: any = await open(sName, sText);
            expect(sOut.invalid).toBe(true);
            expect(sOut.transport).toBeUndefined();
        }
    });

    it('a server "not found" is neither invalid nor transport', async () => {
        const sOut: any = await open('gone.dsh', { status: 404, headers: {}, data: { success: false, reason: 'not found' } });
        expect(sOut.error).toBe('not found');
        expect(sOut.invalid).toBeUndefined();
    });

    it('opens a valid .dsh as a board', async () => {
        const sOut = await open('ok.dsh', JSON.stringify({ dashboard: { panels: [], timeRange: { start: 'now-1h', end: 'now', refresh: 'Off' } } }));
        expect(sOut.error).toBeUndefined();
        expect(sOut.board).toMatchObject({ id: 'board-1', name: 'ok.dsh', type: 'dsh', path: '/d/' });
    });

    it('opens a valid .wrk as a board', async () => {
        const sOut = await open('ok.wrk', JSON.stringify({ data: [{ type: 'mrk', contents: '' }] }));
        expect(sOut.error).toBeUndefined();
        expect(sOut.board).toMatchObject({ name: 'ok.wrk', type: 'wrk' });
    });

    it('requests the encoded-ready raw path', async () => {
        await open('a.sql', 'SELECT 1');
        expect(getFiles).toHaveBeenCalledWith('/d/a.sql');
    });
});

// r17/r18: URL download now accepts py/sh/ipynb/htm/mjs/markdown/apng/avif/tiff (SERVER_FILE_EXTENSIONS). Clicking such a file in the explorer
// goes onSelect → loadBoardFromFile → a tab whose type is the extension. None of them is in EXTENSION_SET, so
// MainContent.checkExtension routes them to UnknownExtension (read-only Monaco; objects are JSON.stringified).
describe('loadBoardFromFile — server-only extensions (download set)', () => {
    beforeEach(() => jest.clearAllMocks());

    it.each([
        ['x.py', 'print(1)\n'],
        ['x.sh', '#!/bin/sh\necho hi\n'],
        ['x.htm', '<p>hi</p>'],
        ['x.mjs', 'export const a = 1;\n'],
        ['r.markdown', '# hi\n'],
        // not in IMAGE_EXTENSION_LIST: fetched without responseType arraybuffer, shown read-only like any unknown file
        ['a.apng', '\u0089PNG'],
        ['x.avif', 'ftypavif'],
        ['scan.tiff', 'II*\u0000'],
        // axios parses a JSON body (no raw-text override for .ipynb in the interceptor) → an object arrives
        ['x.ipynb', { cells: [], metadata: {}, nbformat: 4, nbformat_minor: 5 }],
    ])('%s opens as an unknown-extension tab without throwing', async (aName, aContent) => {
        const sOut = await open(aName, aContent);
        expect(sOut.error).toBeUndefined();
        const sExt = aName.split('.').at(-1) as string;
        expect(sOut.board).toMatchObject({ id: 'board-1', name: aName, path: '/d/', type: sExt, code: aContent });
        expect(EXTENSION_SET.has(sExt)).toBe(false);
    });
});
