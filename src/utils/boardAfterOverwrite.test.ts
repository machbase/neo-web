// After an overwrite the tab being saved must stay (Save As onto its own file reached a branch that dropped it,
// round 7 HIGH) and the written file keeps ONE representative tab (issue-1544 r13/r15). r20: the file is written
// under the TYPED name; other tabs are touched only after a confirmed overwrite and are then matched by exact path +
// case-insensitive name — the same comparison that raised the question.
import { afterOverwrite, isTabOnFile, tabFromWrittenContent } from './boardAfterOverwrite';

const tab = (id: string, name: string, path: string, extra: Record<string, unknown> = {}) => ({ id, name, path, code: id, ...extra });
const mark = (aTab: any) => ({ ...aTab, code: 'NEW', savedCode: 'NEW' });

describe('isTabOnFile', () => {
    it('exact path, name compared case-insensitively (r20)', () => {
        expect(isTabOnFile(tab('a', 'a.sql', '/d/'), { name: 'a.sql', path: '/d/' })).toBe(true);
        expect(isTabOnFile(tab('a', 'A.sql', '/d/'), { name: 'a.sql', path: '/d/' })).toBe(true);
        expect(isTabOnFile(tab('a', 'a.sql', '/d/'), { name: 'A.SQL', path: '/d/' })).toBe(true);
        expect(isTabOnFile(tab('a', 'a.sql', '/D/'), { name: 'a.sql', path: '/d/' })).toBe(false);
        expect(isTabOnFile(tab('a', 'a.sql', '/x/'), { name: 'a.sql', path: '/d/' })).toBe(false);
        expect(isTabOnFile(tab('a', 'b.sql', '/d/'), { name: 'a.sql', path: '/d/' })).toBe(false);
    });
});

describe('afterOverwrite', () => {
    it('keeps and updates the current tab even when it is open on the file itself (own-file Save As)', () => {
        const sOut = afterOverwrite([tab('t1', 'q.sql', '/')], { path: '/', name: 'q.sql', currentTabId: 't1', confirmed: true }, mark);
        expect(sOut).toEqual([{ ...tab('t1', 'q.sql', '/'), code: 'NEW', savedCode: 'NEW' }]);
    });

    it('confirmed: closes OTHER tabs on the file (case-insensitive name, the file the user agreed to overwrite); keeps other path / other name', () => {
        const sTabs = [tab('cur', 'new.sql', '/'), tab('dup', 'a.sql', '/'), tab('caseOnly', 'A.SQL', '/'), tab('otherPath', 'a.sql', '/x/'), tab('otherName', 'b.sql', '/')];
        const sOut = afterOverwrite(sTabs, { path: '/', name: 'A.sql', currentTabId: 'cur', confirmed: true }, (aT) => ({ ...aT, name: 'A.sql' }));
        expect(sOut.map((aT) => aT.id)).toEqual(['cur', 'otherPath', 'otherName']);
        expect(sOut[0].name).toBe('A.sql');
        expect(sOut[1]).toBe(sTabs[3]);
    });

    it('NOT confirmed: a case-different tab is never touched (no question was asked about it)', () => {
        const sTabs = [tab('cur', 'new.sql', '/'), tab('caseOnly', 'a.sql', '/')];
        const sOut = afterOverwrite(sTabs, { path: '/', name: 'A.sql', currentTabId: 'cur', confirmed: false }, mark);
        expect(sOut[1]).toBe(sTabs[1]);
    });

    it('an update returning null closes that tab (binary content)', () => {
        const sTabs = [tab('dash', 'board.dsh', '/'), tab('img', 'p.png', '/')];
        expect(afterOverwrite(sTabs, { path: '/', name: 'p.png', confirmed: true }, () => null).map((aT) => aT.id)).toEqual(['dash']);
    });

    it('NOT confirmed (new file): only the current tab is updated, a tab on the same path+name is left alone', () => {
        const sTabs = [tab('cur', 'new.sql', '/'), tab('dup', 'a.sql', '/')];
        const sOut = afterOverwrite(sTabs, { path: '/', name: 'a.sql', currentTabId: 'cur', confirmed: false }, mark);
        expect(sOut.map((aT) => [aT.id, aT.code])).toEqual([
            ['cur', 'NEW'],
            ['dup', 'dup'],
        ]);
    });

    it('no writer tab (SaveDashboardModal .tql export), confirmed: the FIRST tab on the file is updated, the rest closed', () => {
        const sTabs = [tab('dash', 'board.dsh', '/'), tab('onFile1', 'x.tql', '/'), tab('onFile2', 'x.tql', '/'), tab('elsewhere', 'x.tql', '/o/')];
        const sOut = afterOverwrite(sTabs, { path: '/', name: 'x.tql', confirmed: true }, mark);
        expect(sOut.map((aT) => [aT.id, aT.code])).toEqual([
            ['dash', 'dash'],
            ['onFile1', 'NEW'],
            ['elsewhere', 'elsewhere'],
        ]);
    });

    it('no writer tab, not confirmed: nothing changes', () => {
        const sTabs = [tab('dash', 'board.dsh', '/'), tab('onFile', 'x.tql', '/')];
        expect(afterOverwrite(sTabs, { path: '/', name: 'x.tql', confirmed: false }, mark)).toEqual(sTabs);
    });
});

describe('tabFromWrittenContent (r20 M3 — New file / URL download / .tql export)', () => {
    it('text → code and savedCode are exactly what was written, the tab takes the written name', () => {
        expect(tabFromWrittenContent('select 2', 'A.sql')(tab('t', 'a.sql', '/'))).toEqual({ ...tab('t', 'A.sql', '/'), code: 'select 2', savedCode: 'select 2' });
    });
    it('no content (New file .sql) → empty text', () => {
        expect(tabFromWrittenContent(undefined, 'a.sql')(tab('t', 'a.sql', '/'))).toMatchObject({ code: '', savedCode: '' });
    });
    it('an object payload is what axios sends: JSON.stringify', () => {
        expect(tabFromWrittenContent({ a: 1 }, 'x.json')(tab('t', 'x.json', '/'))).toMatchObject({ code: '{"a":1}', savedCode: '{"a":1}' });
    });
    it('binary content, an image tab, or a board tab (dsh/wrk/taz) → null (closed)', () => {
        expect(tabFromWrittenContent(new ArrayBuffer(4), 'p.png')(tab('t', 'p.png', '/'))).toBeNull();
        expect(tabFromWrittenContent('<svg/>', 'i.svg')(tab('t', 'i.svg', '/'))).toBeNull();
        expect(tabFromWrittenContent({ dashboard: {} }, 'b.dsh')(tab('t', 'b.DSH', '/'))).toBeNull();
        expect(tabFromWrittenContent({ data: [] }, 'w.wrk')(tab('t', 'w.wrk', '/'))).toBeNull();
        expect(tabFromWrittenContent({}, 't.taz')(tab('t', 't.taz', '/'))).toBeNull();
    });
});
