import request, {setUserInitiatedLogout} from '@/api/core';
import {cancelAllPendingFileWrites} from '@/api/repository/fileWriteQueue';
import {resolveTrackedOverwrite} from './fileTargetInspection';

const adapter = request.defaults.adapter;
afterEach(() => {
    request.defaults.adapter = adapter;
    cancelAllPendingFileWrites();
    localStorage.clear();
});

// Exercise the real Axios refresh interceptor at every kind of pre-save lookup.
for (const stage of ['target-folder', 'parent-folder', 'alias-file'] as const) {
    for (const outcome of ['success', '500', 'success-false'] as const) {
        test(`${stage}: cancellation during refresh ${outcome} neither retries nor logs out`, async () => {
            setUserInitiatedLogout(false);
            localStorage.setItem('accessToken', 'old'); localStorage.setItem('refreshToken', 'old');
            let current = true, challenged = false, attempts = 0;
            let release!: () => void, started!: () => void;
            const gate = new Promise<void>(resolve => release = resolve);
            const refreshing = new Promise<void>(resolve => started = resolve);
            const path = stage === 'target-folder' ? '/api/files/work/' : stage === 'parent-folder' ? '/api/files/' : '/api/files/work/b.SQL';
            const logout = jest.fn(); window.addEventListener('logoutEvent', logout);
            request.defaults.adapter = async config => {
                const response = (data: unknown, status = 200) => ({data, status, statusText: '', headers: {}, config});
                if (config.url === '/api/relogin') {
                    started(); await gate;
                    if (outcome === '500') throw {isAxiosError: true, config, response: response({success: false}, 500)};
                    return response({success: outcome === 'success', accessToken: 'new', refreshToken: 'new'});
                }
                if (config.url === path) {
                    attempts++;
                    if (!challenged) {challenged = true; throw {isAxiosError: true, config, response: response({success: false}, 401)};}
                }
                return response({success: true, data: {isDir: true, children: config.url === '/api/files/'
                    ? [{name: 'work', isDir: true}] : stage === 'alias-file' ? [{name: 'B.sql', isDir: false}] : []}});
            };
            try {
                const ask = jest.fn(async () => true);
                const pending = resolveTrackedOverwrite('/work/', 'b.SQL', ask, () => current);
                await refreshing; current = false; release();
                expect(await pending).toEqual({status: 'cancel'});
                expect(attempts).toBe(1); expect(logout).not.toHaveBeenCalled(); expect(ask).not.toHaveBeenCalled();
            } finally {release(); window.removeEventListener('logoutEvent', logout);}
        });
    }
}
