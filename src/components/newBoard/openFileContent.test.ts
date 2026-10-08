import { OPENABLE_EXTENSIONS, OPEN_FILE_ACCEPT, parseOpenedFile, validateBoardContent } from './openFileContent';
import { loadTazBoard } from '@/components/tagAnalyzer/persistence/tazDocumentService';

jest.mock('@/components/tagAnalyzer/persistence/tazDocumentService', () => ({
    loadTazBoard: jest.fn(),
}));

describe('parseOpenedFile', () => {
    beforeEach(() => jest.clearAllMocks());

    it.each(['dsh', 'taz', 'wrk'])('rejects broken JSON for .%s without throwing', (aExt) => {
        let sOut: any;
        expect(() => {
            sOut = parseOpenedFile(aExt, '{not json', `x.${aExt}`, 'id1');
        }).not.toThrow();
        expect(sOut.ok).toBe(false);
        expect(typeof sOut.error).toBe('string');
    });

    it('rejects {} as .dsh (no dashboard key)', () => {
        expect(parseOpenedFile('dsh', '{}', 'x.dsh', 'id1').ok).toBe(false);
    });

    it('rejects a .wrk without a data array', () => {
        expect(parseOpenedFile('wrk', '{}', 'x.wrk', 'id1').ok).toBe(false);
        expect(parseOpenedFile('wrk', '{"data":{}}', 'x.wrk', 'id1').ok).toBe(false);
    });

    it('opens a valid .dsh as a whole-tab replacement named after the file, path ""', () => {
        const sOut = parseOpenedFile('dsh', JSON.stringify({ name: 'old', path: '/srv/', dashboard: { panels: [] } }), 'board.dsh', 'id1');
        expect(sOut.ok).toBe(true);
        if (!sOut.ok || sOut.mode !== 'replace') throw new Error('expected replace');
        expect(sOut.board.name).toBe('board.dsh');
        expect(sOut.board.path).toBe('');
        expect(sOut.board.type).toBe('dsh');
        expect(sOut.board.dashboard).toEqual({ panels: [] });
    });

    it('a dsh replacement carries no leftover code from a previous sql tab', () => {
        const sOut = parseOpenedFile('dsh', JSON.stringify({ dashboard: { panels: [] } }), 'b.dsh', 'id1');
        if (!sOut.ok || sOut.mode !== 'replace') throw new Error('expected replace');
        const sPrevTab = { id: 'id1', type: 'sql', name: 'q.sql', code: 'SELECT 1', sheet: [] };
        // newBoard/index.tsx replaces the tab object: { ...board, id }
        const sNewTab: any = { ...sOut.board, id: sPrevTab.id };
        expect(sNewTab.code).toBeUndefined();
        expect(sNewTab.type).toBe('dsh');
    });

    it('new tab: opening dsh/taz over a sql/wrk tab fully replaces it (no code/sheet/savedCode left behind)', () => {
        const sPrevTabs = [
            { id: 'id1', type: 'sql', name: 'q.sql', path: '/srv/', code: 'SELECT 1', savedCode: 'SELECT 1' },
            { id: 'id1', type: 'wrk', name: 'w.wrk', path: '/srv/', sheet: [{ id: 's' }], savedCode: '[]' },
        ];
        (loadTazBoard as jest.Mock).mockReturnValue({ id: 'id1', type: 'taz', name: 't.taz', path: '', panels: [] });
        for (const sPrev of sPrevTabs) {
            for (const [sExt, sText] of [
                ['dsh', JSON.stringify({ dashboard: { panels: [] } })],
                ['taz', JSON.stringify({ panels: [] })],
            ]) {
                const sOut = parseOpenedFile(sExt, sText, `n.${sExt}`, sPrev.id);
                if (!sOut.ok || sOut.mode !== 'replace') throw new Error('expected replace for ' + sExt);
                // mirrors newBoard/index.tsx uploadFile: sBoardList.map(tab => tab.id === sel ? { ...board, id } : tab)
                const sNewTab: any = [sPrev].map((aItem: any) => (aItem.id === 'id1' ? { ...sOut.board, id: aItem.id } : aItem))[0];
                expect(sNewTab.type).toBe(sExt);
                expect(sNewTab.path).toBe('');
                expect(sNewTab.code).toBeUndefined();
                expect(sNewTab.sheet).toBeUndefined();
                expect(sNewTab.savedCode).toBeUndefined();
            }
        }
    });

    it('delegates .taz to loadTazBoard with path ""', () => {
        (loadTazBoard as jest.Mock).mockReturnValue({ id: 'id1', type: 'taz', name: 't.taz', path: '' });
        const sOut = parseOpenedFile('taz', JSON.stringify({ version: 'x', panels: [] }), 't.taz', 'id1');
        expect(loadTazBoard).toHaveBeenCalledWith({ version: 'x', panels: [] }, 'id1', 't.taz', '');
        expect(sOut.ok).toBe(true);
    });

    it('turns a loadTazBoard throw into ok:false', () => {
        (loadTazBoard as jest.Mock).mockImplementation(() => {
            throw new Error('unsupported taz');
        });
        expect(parseOpenedFile('taz', '{}', 't.taz', 'id1')).toEqual({ ok: false, error: 'unsupported taz' });
    });

    it('merges a valid .wrk sheet', () => {
        const sOut = parseOpenedFile('wrk', JSON.stringify({ data: [{ type: 'mrk' }] }), 'w.wrk', 'id1');
        expect(sOut).toEqual({ ok: true, mode: 'merge', fields: { name: 'w.wrk', sheet: [{ type: 'mrk' }], type: 'wrk' } });
    });

    it.each(['sql', 'tql', 'json', 'csv', 'md', 'txt'])('passes .%s text through untouched', (aExt) => {
        expect(parseOpenedFile(aExt, 'not { json', `f.${aExt}`, 'id1')).toEqual({ ok: true, mode: 'merge', fields: { name: `f.${aExt}`, code: 'not { json', type: aExt } });
    });
});

describe('validateBoardContent', () => {
    it('dsh needs an object dashboard', () => {
        expect(validateBoardContent('dsh', { dashboard: {} })).toBeNull();
        expect(validateBoardContent('dsh', {})).not.toBeNull();
        expect(validateBoardContent('dsh', { dashboard: [] })).not.toBeNull();
    });
    it('wrk needs a data array', () => {
        expect(validateBoardContent('wrk', { data: [] })).toBeNull();
        expect(validateBoardContent('wrk', {})).not.toBeNull();
    });
});

describe('OPEN_FILE_ACCEPT', () => {
    it('lets the file picker select every extension "Open a file" can open', () => {
        const sAccepted = OPEN_FILE_ACCEPT.split(',');
        for (const aExt of ['wrk', 'taz', 'dsh', 'sql', 'tql', 'json', 'csv', 'md', 'txt']) expect(sAccepted).toContain('.' + aExt);
        expect(sAccepted).toHaveLength(OPENABLE_EXTENSIONS.length);
    });
});
