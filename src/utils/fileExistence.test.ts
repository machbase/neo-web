import { checkTargetExists, cloneReplaceMessage, findExistingEntry, getTypedFileList, keepTypeEntries, resolveCloneTarget, resolveOverwrite, savedNameOf } from './fileExistence';
import { getFiles } from '@/api/repository/fileTree';
import { getFileList } from '@/api/repository/api';

jest.mock('@/api/repository/fileTree', () => ({
    getFiles: jest.fn(),
}));
jest.mock('@/api/repository/api', () => ({
    getFileList: jest.fn(),
}));

describe('findExistingEntry', () => {
    const sChildren = [
        { name: 'a.sql', isDir: false },
        { name: 'docs', isDir: true },
        { name: 'Report.TQL', isDir: false },
    ];
    it('finds an exact file', () => {
        expect(findExistingEntry(sChildren, 'a.sql')).toEqual({ name: 'a.sql', isDir: false });
    });
    it('finds an exact folder', () => {
        expect(findExistingEntry(sChildren, 'docs')).toEqual({ name: 'docs', isDir: true });
    });
    it('a case-only difference exists and returns the server\'s real name (r12)', () => {
        expect(findExistingEntry(sChildren, 'report.tql')).toEqual({ name: 'Report.TQL', isDir: false });
        expect(findExistingEntry(sChildren, 'A.sql')).toEqual({ name: 'a.sql', isDir: false });
        expect(findExistingEntry(sChildren, 'DOCS')).toEqual({ name: 'docs', isDir: true });
        expect(findExistingEntry(sChildren, 'Report.TQL')).toEqual({ name: 'Report.TQL', isDir: false });
    });
    it('prefers the exact entry when both cases exist (Linux)', () => {
        expect(findExistingEntry([{ name: 'A.sql', isDir: false }, { name: 'a.sql', isDir: false }], 'a.sql')).toEqual({ name: 'a.sql', isDir: false });
    });
    it('returns null when nothing matches', () => {
        expect(findExistingEntry(sChildren, 'b.sql')).toBeNull();
    });
    it('returns null when children is missing', () => {
        expect(findExistingEntry(undefined, 'a.sql')).toBeNull();
        expect(findExistingEntry(null, 'a.sql')).toBeNull();
    });
    it('recognises the save dialog shape (type: dir)', () => {
        expect(findExistingEntry([{ name: 'x', type: 'dir' }], 'x')).toEqual({ name: 'x', isDir: true });
    });
    it('r15: a virtual item (not on disk) is not an existing entry; a real same-name entry still is', () => {
        expect(findExistingEntry([{ name: 'neo-apps', isDir: true, virtual: true }], 'neo-apps')).toBeNull();
        expect(findExistingEntry([{ name: 'neo-apps', isDir: true, virtual: true }, { name: 'Neo-Apps', isDir: true }], 'neo-apps')).toEqual({ name: 'Neo-Apps', isDir: true });
        expect(findExistingEntry([{ name: 'a.sql', isDir: false, virtual: false }], 'a.sql')).toEqual({ name: 'a.sql', isDir: false });
    });
});

describe('checkTargetExists', () => {
    it('queries the parent directory and returns the raw response', async () => {
        const sRes = { success: true, data: { children: [{ name: 'n', isDir: true }] } };
        (getFiles as jest.Mock).mockResolvedValue(sRes);
        const sOut = await checkTargetExists('/p', 'n');
        expect(getFiles).toHaveBeenCalledWith('/p/');
        expect(sOut.entry).toEqual({ name: 'n', isDir: true });
        expect(sOut.response).toBe(sRes);
    });
    it('a failed lookup is not an entry', async () => {
        (getFiles as jest.Mock).mockResolvedValue({ status: 404, headers: {}, data: { success: false, reason: 'not found' } });
        const sOut = await checkTargetExists('/missing/', 'n');
        expect(sOut.entry).toBeNull();
    });
});

describe('resolveOverwrite (shared check)', () => {
    beforeEach(() => jest.clearAllMocks());
    it('re-queries without a filter and asks only for an exact existing file', async () => {
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { children: [{ name: 'X.DSH', isDir: false }] } });
        const sAsk = jest.fn().mockResolvedValue(false);
        expect(await resolveOverwrite('/d', 'X.DSH', sAsk)).toEqual({ status: 'cancel' });
        expect(getFiles).toHaveBeenCalledWith('/d/');
        expect(sAsk).toHaveBeenCalledWith('X.DSH');
    });
    it('confirmed / none / folder / failed', async () => {
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { children: [{ name: 'a.sql', isDir: false }, { name: 'f', isDir: true }] } });
        expect(await resolveOverwrite('/', 'a.sql', () => Promise.resolve(true))).toEqual({ status: 'confirmed', existingName: 'a.sql' });
        // r13: confirmed carries the server's real name — 'A.sql' typed, 'a.sql' there
        expect(await resolveOverwrite('/', 'A.sql', () => Promise.resolve(true))).toEqual({ status: 'confirmed', existingName: 'a.sql' });
        const sAsk = jest.fn();
        expect(await resolveOverwrite('/', 'b.sql', sAsk)).toEqual({ status: 'none' });
        expect((await resolveOverwrite('/', 'f', sAsk)).status).toBe('folder');
        expect((await resolveOverwrite('/', 'F', sAsk)).status).toBe('folder');
        expect(sAsk).not.toHaveBeenCalled();
        // case-only: asks, with the existing real name
        const sAskCase = jest.fn().mockResolvedValue(false);
        expect(await resolveOverwrite('/', 'A.SQL', sAskCase)).toEqual({ status: 'cancel' });
        expect(sAskCase).toHaveBeenCalledWith('a.sql');
        (getFiles as jest.Mock).mockResolvedValue({ status: 500, headers: {}, data: { success: false, reason: 'boom' } });
        expect(await resolveOverwrite('/', 'a.sql', sAsk)).toEqual({ status: 'failed', reason: 'boom' });
    });
});

describe('savedNameOf (r13)', () => {
    it('is the real name after a confirm, the typed name otherwise', () => {
        expect(savedNameOf({ status: 'confirmed', existingName: 'a.sql' }, 'A.sql')).toBe('a.sql');
        expect(savedNameOf({ status: 'none' }, 'A.sql')).toBe('A.sql');
    });
});

describe('resolveCloneTarget (r14)', () => {
    beforeEach(() => jest.clearAllMocks());
    const sList = { success: true, data: { children: [{ name: 'Repo', isDir: true }, { name: 'x.sql', isDir: false }] } };
    it('free name → none, no question', async () => {
        (getFiles as jest.Mock).mockResolvedValue(sList);
        const sAsk = jest.fn();
        expect(await resolveCloneTarget('/', 'other', sAsk)).toEqual({ status: 'none' });
        expect(sAsk).not.toHaveBeenCalled();
    });
    it('same-name folder (case-insensitive) → asks with the real name; confirm/cancel', async () => {
        (getFiles as jest.Mock).mockResolvedValue(sList);
        const sAsk = jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
        expect(await resolveCloneTarget('/', 'repo', sAsk)).toEqual({ status: 'confirmed', existingName: 'Repo' });
        expect(await resolveCloneTarget('/', 'REPO', sAsk)).toEqual({ status: 'cancel' });
        expect(sAsk).toHaveBeenCalledWith('Repo');
    });
    it('same-name file → blocked; failed lookup → failed', async () => {
        (getFiles as jest.Mock).mockResolvedValue(sList);
        expect((await resolveCloneTarget('/', 'X.SQL', jest.fn())).status).toBe('file');
        (getFiles as jest.Mock).mockResolvedValue({ status: 500, headers: {}, data: { success: false, reason: 'boom' } });
        expect(await resolveCloneTarget('/', 'repo', jest.fn())).toEqual({ status: 'failed', reason: 'boom' });
    });
    it('the clone message says what is lost', () => {
        expect(cloneReplaceMessage('Repo')).toBe(
            "A folder named 'Repo' already exists. Cloning will replace its contents and delete the files in it. Do you want to continue?"
        );
    });
});

// r19: the server `?filter=*.sql` is case-sensitive (measured: `*.sql` drops `X.SQL`), so the type lists are
// fetched unfiltered and narrowed client-side, extension compared without case.
describe('keepTypeEntries (r19)', () => {
    const sChildren = [
        { name: 'sub', isDir: true, type: 'dir' },
        { name: 'X.SQL', isDir: false, type: '.SQL' },
        { name: 'x.Sql', isDir: false, type: '.Sql' },
        { name: 'x.sql', isDir: false, type: '.sql' },
        { name: 'x.tql', isDir: false, type: '.tql' },
        { name: 'sql', isDir: false, type: '' },
        { name: 'my.sql.bak', isDir: false, type: '.bak' },
    ];
    it('keeps X.SQL / x.Sql / x.sql for type sql, drops x.tql and non-sql names, keeps folders, keeps server order', () => {
        expect(keepTypeEntries(sChildren, 'sql').map((aC) => aC.name)).toEqual(['sub', 'X.SQL', 'x.Sql', 'x.sql']);
    });
    it('the type itself is compared without case and may carry a leading dot', () => {
        expect(keepTypeEntries(sChildren, 'SQL').map((aC) => aC.name)).toEqual(['sub', 'X.SQL', 'x.Sql', 'x.sql']);
        expect(keepTypeEntries(sChildren, '.sql').map((aC) => aC.name)).toEqual(['sub', 'X.SQL', 'x.Sql', 'x.sql']);
    });
    it('a folder is recognised by isDir or by type "dir", even with a dotted name', () => {
        expect(keepTypeEntries([{ name: 'v1.tql', isDir: true }, { name: 'd.x', type: 'dir' }] as any, 'sql').map((aC: any) => aC.name)).toEqual(['v1.tql', 'd.x']);
    });
    it('missing children → empty list', () => {
        expect(keepTypeEntries(undefined, 'sql')).toEqual([]);
        expect(keepTypeEntries(null, 'sql')).toEqual([]);
    });
});

describe('getTypedFileList (r19)', () => {
    beforeEach(() => jest.clearAllMocks());
    it('requests the folder WITHOUT ?filter= and returns the same response shape with narrowed children', async () => {
        (getFileList as jest.Mock).mockResolvedValue({
            success: true,
            reason: 'success',
            data: { isDir: true, name: 's', children: [{ name: 'sub', isDir: true, type: 'dir' }, { name: 'X.SQL', isDir: false }, { name: 'b.tql', isDir: false }] },
        });
        const sRes = await getTypedFileList('sql', 's');
        expect(getFileList).toHaveBeenCalledWith('', 's', '');
        expect(sRes).toEqual({
            success: true,
            reason: 'success',
            data: { isDir: true, name: 's', children: [{ name: 'sub', isDir: true, type: 'dir' }, { name: 'X.SQL', isDir: false }] },
        });
    });
    it('a failed response (no children) is returned untouched', async () => {
        const sFail = { success: false, reason: 'boom', data: null };
        (getFileList as jest.Mock).mockResolvedValue(sFail);
        expect(await getTypedFileList('sql', '')).toBe(sFail);
    });
});
