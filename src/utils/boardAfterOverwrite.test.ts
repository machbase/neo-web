// After an overwrite the tab being saved must stay (Save As onto its own file reached a branch that dropped it,
// round 7 HIGH) and the written file keeps ONE representative tab (issue-1544 r13/r15). r15: the file is matched by
// EXACT real name + path (every caller writes with the server's real name), and other tabs are closed only after a
// confirmed overwrite.
import { afterOverwrite, isTabOnFile } from './boardAfterOverwrite';

const tab = (id: string, name: string, path: string, extra: Record<string, unknown> = {}) => ({ id, name, path, code: id, ...extra });
const mark = (aTab: any) => ({ ...aTab, code: 'NEW', savedCode: 'NEW' });

describe('isTabOnFile', () => {
    it('compares real name + path EXACTLY', () => {
        expect(isTabOnFile(tab('a', 'a.sql', '/d/'), { name: 'a.sql', path: '/d/' })).toBe(true);
        expect(isTabOnFile(tab('a', 'A.sql', '/d/'), { name: 'a.sql', path: '/d/' })).toBe(false);
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

    it('confirmed: closes OTHER tabs on the exact file; keeps case-different name, other path, other name', () => {
        const sTabs = [tab('cur', 'new.sql', '/'), tab('dup', 'a.sql', '/'), tab('caseOnly', 'A.SQL', '/'), tab('otherPath', 'a.sql', '/x/'), tab('otherName', 'b.sql', '/')];
        const sOut = afterOverwrite(sTabs, { path: '/', name: 'a.sql', currentTabId: 'cur', confirmed: true }, (aT) => ({ ...aT, name: 'a.sql' }));
        expect(sOut.map((aT) => aT.id)).toEqual(['cur', 'caseOnly', 'otherPath', 'otherName']);
        expect(sOut[0].name).toBe('a.sql');
        expect(sOut[1]).toBe(sTabs[2]);
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
