jest.mock('@/design-system/components', () => ({ Toast: { error: jest.fn(), success: jest.fn() } }));

import axios from 'axios';
import request, { executeReLogin } from './index';
import { postFileList } from '@/api/repository/api';
import { cancelAllPendingFileWrites } from '@/api/repository/fileWriteQueue';
import { logOut, postLogin } from '@/api/repository/login';

const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; };
const originalAdapter = request.defaults.adapter;
const A = { accessToken: 'A_ACCESS', refreshToken: 'A_REFRESH' };
const B = { accessToken: 'B_ACCESS', refreshToken: 'B_REFRESH' };
const setTokens = (tokens: typeof A) => { localStorage.setItem('accessToken', tokens.accessToken); localStorage.setItem('refreshToken', tokens.refreshToken); };
beforeEach(() => { cancelAllPendingFileWrites(); localStorage.clear(); setTokens(A); });
afterEach(() => { request.defaults.adapter = originalAdapter; cancelAllPendingFileWrites(); localStorage.clear(); });

it.each([false, true])('does not retry an old save after another login (refresh already started: %s)', async refreshStarted => {
    const entered = deferred(), gate = deferred();
    const files: any[] = [], refreshes: string[] = [];
    request.defaults.adapter = async config => {
        const ok = (data: any) => ({data, status: 200, statusText: 'OK', headers: {}, config});
        if (config.url === '/api/logout') return ok({success: true});
        if (config.url === '/api/login') return ok({success: true, ...B});
        if (config.url === '/api/relogin') {
            refreshes.push(JSON.parse(config.data).refreshToken);
            entered.resolve(); await gate.promise;
            return ok({success: true, accessToken: 'A_REFRESHED', refreshToken: 'A_ROTATED'});
        }
        files.push({body: config.data, authorization: config.headers.Authorization});
        if (files.length === 1) {
            if (!refreshStarted) { entered.resolve(); await gate.promise; }
            throw {isAxiosError: true, config, response: {status: 401, config, data: {reason: 'expired'}}};
        }
        return ok({success: true});
    };
    const pending = postFileList('A_PRIVATE_DRAFT', '/', 'old.sql');
    await entered.promise;
    try {
        await logOut(); localStorage.clear();
        const result: any = await postLogin({loginName: 'B', password: 'test'}); setTokens(result);
        gate.resolve(); expect(await pending).toMatchObject({success: false});
        expect(files).toEqual([{body: 'A_PRIVATE_DRAFT', authorization: 'Bearer A_ACCESS'}]);
        expect(refreshes).toEqual(refreshStarted ? ['A_REFRESH'] : []);
        expect(localStorage.getItem('accessToken')).toBe(B.accessToken);
        expect(localStorage.getItem('refreshToken')).toBe(B.refreshToken);
    } finally { gate.resolve(); await pending.catch(() => {}); }
});

it('shares one refresh for current-login saves and still retries both writes', async () => {
    const entered = deferred(), gate = deferred(); let refreshes = 0;
    const attempts = new Map<string, number>();
    request.defaults.adapter = async config => {
        const ok = (data: any) => ({data, status: 200, statusText: 'OK', headers: {}, config});
        if (config.url === '/api/relogin') { refreshes++; entered.resolve(); await gate.promise; return ok({success: true, accessToken: 'A_NEW', refreshToken: 'A_NEW_REFRESH'}); }
        const count = (attempts.get(config.url!) ?? 0) + 1; attempts.set(config.url!, count);
        if (count === 1) throw {isAxiosError: true, config, response: {status: 401, config, data: {reason: 'expired'}}};
        expect(config.headers.Authorization).toBe('Bearer A_NEW');
        return ok({success: true});
    };
    const pending = [postFileList('ONE', '/', 'one.sql'), postFileList('TWO', '/', 'two.sql')];
    await entered.promise; gate.resolve();
    expect((await Promise.all(pending)).map(result => result.success)).toEqual([true, true]);
    expect(refreshes).toBe(1); expect([...attempts.values()]).toEqual([2, 2]);
});

it('starts a new-login refresh without joining the previous login refresh', async () => {
    const oldEntered = deferred(), oldGate = deferred(), newGate = deferred();
    let newRefreshes = 0;
    request.defaults.adapter = async config => {
        const ok = (data: any) => ({data, status: 200, statusText: 'OK', headers: {}, config});
        if (config.url === '/api/logout') return ok({success: true});
        if (config.url === '/api/login') return ok({success: true, ...B});
        const token = JSON.parse(config.data).refreshToken;
        if (token === A.refreshToken) { oldEntered.resolve(); await oldGate.promise; return ok({success: true, accessToken: 'A_LATE', refreshToken: 'A_LATE_REFRESH'}); }
        newRefreshes++; await newGate.promise;
        return ok({success: true, accessToken: 'B_NEW', refreshToken: 'B_NEW_REFRESH'});
    };
    const old = executeReLogin().then(() => false, error => axios.isCancel(error));
    await oldEntered.promise;
    let newer: Promise<any> | undefined, joined: Promise<any> | undefined;
    try {
        await logOut(); localStorage.clear();
        const result: any = await postLogin({loginName: 'B', password: 'test'}); setTokens(result);
        newer = executeReLogin();
        for (let i = 0; i < 20 && !newRefreshes; i++) await Promise.resolve();
        expect(newRefreshes).toBe(1);
        oldGate.resolve(); expect(await old).toBe(true);
        // Completing A must not clear B's still-pending shared refresh.
        joined = executeReLogin();
        for (let i = 0; i < 20; i++) await Promise.resolve();
        expect(newRefreshes).toBe(1);
        newGate.resolve(); await Promise.all([newer, joined]);
        expect(localStorage.getItem('accessToken')).toBe('B_NEW');
        expect(localStorage.getItem('refreshToken')).toBe('B_NEW_REFRESH');
    } finally { oldGate.resolve(); newGate.resolve(); await Promise.allSettled([old, newer, joined]); }
});
