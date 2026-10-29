import request from '@/api/core';
import { cancelAllPendingFileWrites } from '@/api/repository/fileWriteQueue';
import { saveBoardFile } from '@/utils/boardFileSave';
import { applyFileReadResult, applyFileSaveResult, invalidateFileSaveResult } from '@/utils/boardSaveResult';
import { isBoardSaved } from '@/utils/boardSaveStatus';
import { getFileLookupKey, hasFileIdentity } from '@/utils/fileIdentity';
import { resolveOverwrite } from '@/utils/fileExistence';
import { loadBoardFromFile } from '@/components/side/FileExplorer/loadBoardFromFile';

jest.mock('@/api/core', () => ({ __esModule: true, default: jest.fn() }));
beforeEach(() => { cancelAllPendingFileWrites(); jest.mocked(request).mockReset(); });
afterEach(() => cancelAllPendingFileWrites());

it.each(['wrk', 'dsh'])('%s readback uses the file name, preserving a distinct clean tab with a real tab ID', async type => {
    const upper = 'A가.' + type, lower = 'a가.' + type, alias = lower.normalize('NFD');
    const payload = (value: string) => type === 'wrk'
        ? { data: [{ id: 'cell', type: 'mrk', contents: value }] }
        : { dashboard: { title: value, panels: [], variables: [], distanceRange: { start: '', end: '' }, timeRange: { start: 'now-1h', end: 'now', refresh: 'Off' } } };
    // Case-sensitive APFS: upper/lower are separate, while lower/NFD are aliases.
    const stored = new Map([[upper, JSON.stringify(payload('UPPER'))], [lower, JSON.stringify(payload('LOWER'))]]);
    jest.mocked(request).mockImplementation(async (config: any) => {
        const path = decodeURIComponent(config.url.replace('/api/files', ''));
        if (config.method === 'GET' && path === '/') return { success: true, data: { isDir: true, children: [{ name: upper }, { name: lower }] } } as any;
        const name = path.slice(1).normalize('NFC');
        if (config.method === 'GET') return stored.get(name) as any;
        stored.set(name, typeof config.data === 'string' ? config.data : JSON.stringify(config.data));
        return { success: true } as any;
    });
    const upperOpened = await loadBoardFromFile({ path: '/', name: upper }, 'tab-upper-uuid');
    const ownerOpened = await loadBoardFromFile({ path: '/', name: alias }, 'tab-owner-uuid');
    expect(upperOpened.error).toBeUndefined(); expect(ownerOpened.error).toBeUndefined();
    let boards = [ownerOpened.board, upperOpened.board];
    const unchanged = JSON.parse(JSON.stringify(boards[1]));
    expect(isBoardSaved(boards[1])).toBe(true);
    const loadedTypes: string[] = [];
    expect(await saveBoardFile({ board: boards[0], getSaveBoards: () => boards,
        onSuccess: submitted => { boards = applyFileSaveResult(boards, { path: '/', name: alias }, type, submitted); },
        onRead: loaded => { loadedTypes.push(loaded.type); boards = applyFileReadResult(boards, loaded); },
        onUncertain: (target = { path: '/', name: alias }) => { boards = invalidateFileSaveResult(boards, target); },
    })).toBe(true);
    expect(stored.get(upper)).toBe(JSON.stringify(payload('UPPER')));
    expect(loadedTypes).toEqual([type]);
    expect(boards[1]).toEqual(unchanged);
    expect(isBoardSaved(boards[1])).toBe(true);
});

it.each([['σ', 'ς'], ['ß', 'SS'], ['ẞ', 'SS'], ['ſ', 's']])('%s/%s share conservative ordering without assuming physical identity', (left, right) => {
    expect(getFileLookupKey('/' + left + '.sql')).toBe(getFileLookupKey('/' + right + '.sql'));
});

for (const mode of ['normalization-insensitive', 'case-insensitive', 'distinct'] as const) for (const equalContent of [false, true]) {
    it(`${mode}, initially equal contents=${equalContent}: ambiguous names acknowledge each real file independently`, async () => {
        const nfc = 'A가.sql', nfd = 'a가.sql'.normalize('NFD');
        const names = mode === 'normalization-insensitive' ? [nfc, 'a가.sql'] : [nfc, nfd];
        const requested = mode === 'case-insensitive' ? nfd.toUpperCase() : nfd;
        const canonical = (path: string) => mode === 'normalization-insensitive' ? path.normalize('NFC') : mode === 'case-insensitive' ? path.toLowerCase() : path;
        const stored = new Map(names.map((name, i) => [canonical('/' + name), equalContent || i === 0 ? 'OLD' : 'OTHER_OLD']));
        const peerOld = stored.get(canonical('/' + names[1]))!;
        let boards = [
            { id: 'owner', path: '/', name: requested, type: 'sql', code: 'FIRST', savedCode: peerOld },
            ...names.map((name, i) => ({ id: 'peer' + i, path: '/', name, type: 'sql', code: stored.get(canonical('/' + name))!, savedCode: stored.get(canonical('/' + name))! })),
        ];
        jest.mocked(request).mockImplementation(async (config: any) => {
            const path = decodeURIComponent(config.url.replace('/api/files', ''));
            if (config.method === 'GET' && path === '/') return { success: true, data: { isDir: true, children: names.map(name => ({ name })) } } as any;
            if (config.method === 'GET') return (stored.get(canonical(path)) ?? { status: 404, headers: {}, data: { reason: 'missing' } }) as any;
            stored.set(canonical(path), config.data); return { success: true } as any;
        });
        expect(await saveBoardFile({ board: boards[0], getSaveBoards: () => boards,
            onSuccess: submitted => { boards = applyFileSaveResult(boards, boards[0], 'sql', submitted); },
            onRead: loaded => { boards = applyFileReadResult(boards, loaded); },
            onUncertain: (target = boards[0]) => { boards = invalidateFileSaveResult(boards, target); },
        })).toBe(true);
        expect(stored.get(canonical('/' + names[0]))).toBe('OLD');
        expect(stored.get(canonical('/' + names[1]))).toBe('FIRST');
        expect(boards[1].code).toBe('OLD'); expect(boards[1].savedCode).toBe('OLD'); expect(isBoardSaved(boards[1])).toBe(true);
        expect(boards[2].code).toBe(peerOld); expect(boards[2].savedCode).toBe('FIRST'); expect(isBoardSaved(boards[2])).toBe(false);
        if (mode !== 'distinct') expect(hasFileIdentity('/' + requested)).toBe(false);
    });
}

it('does not choose a physical file from a successful GET when several candidates exist', async () => {
    jest.mocked(request).mockImplementation(async (config: any) => config.url === '/api/files/'
        ? { success: true, data: { isDir: true, children: [{ name: 'A가.sql' }, { name: 'a가.sql' }] } } as any : 'IDENTICAL' as any);
    const name = 'a가.sql'.normalize('NFD'), ask = jest.fn(async () => true);
    expect(await resolveOverwrite('/', name, ask)).toEqual({ status: 'confirmed' });
    expect(ask).toHaveBeenCalledWith(name);
    expect(hasFileIdentity('/' + name)).toBe(false);
});

it.each(['read-rejected', 'logout'])('ambiguous readback handles %s without replacing drafts or a new login', async mode => {
    const upper = 'A가.sql', lower = 'a가.sql', alias = lower.normalize('NFD');
    let disk = 'OLD', reading = false, written = false, release!: (value: any) => void;
    const read = new Promise<any>(resolve => release = resolve);
    let boards = [
        { id: 'owner', path: '/', name: alias, type: 'sql', code: 'FIRST', savedCode: 'OLD' },
        { id: 'upper', path: '/', name: upper, type: 'sql', code: 'UPPER', savedCode: 'UPPER' },
        { id: 'lower', path: '/', name: lower, type: 'sql', code: 'OLD', savedCode: 'OLD' },
    ];
    jest.mocked(request).mockImplementation(async (config: any) => {
        const path = decodeURIComponent(config.url.replace('/api/files', ''));
        if (config.method === 'POST') { disk = config.data; written = true; return { success: true } as any; }
        if (path === '/') return { success: true, data: { isDir: true, children: [{ name: upper }, { name: lower }] } } as any;
        if (written && path === '/' + lower) { reading = true; return read; }
        return (path === '/' + upper ? 'UPPER' : disk) as any;
    });
    const saving = saveBoardFile({ board: boards[0], getSaveBoards: () => boards,
        onSuccess: submitted => { boards = applyFileSaveResult(boards, { path: '/', name: alias }, 'sql', submitted); },
        onRead: loaded => { boards = applyFileReadResult(boards, loaded); },
        onUncertain: (target = { path: '/', name: alias }) => { boards = invalidateFileSaveResult(boards, target); },
    });
    for (let i = 0; i < 100 && !reading; i++) await Promise.resolve();
    expect(reading).toBe(true);
    if (mode === 'logout') {
        cancelAllPendingFileWrites();
        boards = [{ id: 'new-login', path: '/', name: lower, type: 'sql', code: 'NEW_USER', savedCode: 'NEW_USER' }];
        release('FIRST');
    } else release({ status: 503, headers: {}, data: { reason: 'read unavailable' } });
    await saving;
    expect(disk).toBe('FIRST');
    if (mode === 'logout') expect(boards).toEqual([{ id: 'new-login', path: '/', name: lower, type: 'sql', code: 'NEW_USER', savedCode: 'NEW_USER' }]);
    else { expect(boards[2].code).toBe('OLD'); expect(boards[2].savedCode).toBe(false); expect(isBoardSaved(boards[1])).toBe(true); }
});
