jest.mock('@/design-system/components', () => ({ Toast: { error: jest.fn(), success: jest.fn() } }));

import request, {setUserInitiatedLogout} from './index';
import {getFiles} from '@/api/repository/fileTree';
import {cancelAllPendingFileWrites} from '@/api/repository/fileWriteQueue';

const originalAdapter = request.defaults.adapter;
const deferred = () => {
    let resolve!: () => void;
    return {promise: new Promise<void>(done => {resolve = done;}), resolve: () => resolve()};
};

afterEach(() => {
    request.defaults.adapter = originalAdapter;
    cancelAllPendingFileWrites();
    localStorage.clear();
});

// The dialogs' browser tests keep their distinct UI entry points. Transport,
// terminal refresh errors and serialized file formats share this retry guard.
for (const format of ['sql', 'wrk', 'dsh', 'taz']) {
    for (const stage of ['listing', 'preflight']) {
        it.each(['cancel-success', 'cancel-500', 'cancel-rejected', 'active-success'])(
            `${format} ${stage}: %s only retries a live read`,
            async outcome => {
                setUserInitiatedLogout(false);
                localStorage.setItem('accessToken', 'current-token');
                localStorage.setItem('refreshToken', 'current-refresh');
                const entered = deferred(), gate = deferred();
                const logout = jest.fn(), canContinue = jest.fn(() => active);
                let active = true, gets = 0, refreshes = 0;
                const path = stage === 'listing' ? `/read-${format}/` : `/read-${format}/copy.${format}`;
                window.addEventListener('logoutEvent', logout);
                request.defaults.adapter = async config => {
                    const response = (data: unknown, status = 200) => ({data, status, statusText: 'test', headers: {}, config});
                    if (config.url === '/api/relogin') {
                        refreshes++; entered.resolve(); await gate.promise;
                        if (outcome === 'cancel-500') throw {isAxiosError: true, config, response: response({success: false}, 500)};
                        return response(outcome === 'cancel-rejected' ? {success: false} : {success: true, accessToken: 'renewed', refreshToken: 'renewed'});
                    }
                    expect(config.url).toBe('/api/files' + path);
                    if (++gets === 1) throw {isAxiosError: true, config, response: response({success: false, reason: 'expired'}, 401)};
                    return response({success: true, data: {isDir: true, children: []}});
                };
                try {
                    const reading = getFiles(path, {rawText: stage === 'preflight', canRetryFileRequest: canContinue});
                    await entered.promise;
                    if (outcome !== 'active-success') active = false;
                    gate.resolve(); await reading;
                    expect(gets).toBe(active ? 2 : 1);
                    expect(refreshes).toBe(1);
                    expect(logout).not.toHaveBeenCalled();
                    expect(canContinue).toHaveBeenCalled();
                } finally {
                    gate.resolve();
                    window.removeEventListener('logoutEvent', logout);
                }
            },
        );
    }
}
