// F-46 / F-47: the public board's request layer refreshed the token once per 401 (four panels → four relogins), and a
// relogin that failed on the network left `undefined`, so reading `.success` threw and no "Session expired" showed.
jest.mock('@/api/repository/login', () => ({ reLogin: jest.fn() }));
jest.mock('@/design-system/components', () => ({ Toast: { error: jest.fn(), success: jest.fn() } }));

import { AxiosError } from 'axios';
import { reLogin } from '@/api/repository/login';
import { Toast } from '@/design-system/components';
import request from './index';

const unauthorized = (aConfig: any) => {
    const sResponse = { status: 401, statusText: 'Unauthorized', headers: {}, config: aConfig, data: { success: false } };
    return Promise.reject(new AxiosError('401', 'ERR_BAD_REQUEST', aConfig, null, sResponse as any));
};

describe('public board request layer — expired token', () => {
    const sAdapter = (request as any).defaults.adapter;
    afterEach(() => {
        (request as any).defaults.adapter = sAdapter;
        jest.clearAllMocks();
        localStorage.clear();
    });

    it('panels that hit 401 together share one relogin and retry with its token', async () => {
        localStorage.setItem('accessToken', 'old');
        (reLogin as jest.Mock).mockImplementation(
            () => new Promise((aResolve) => setTimeout(() => aResolve({ success: true, accessToken: 'new', refreshToken: 'r2' }), 20))
        );
        const sSent: string[] = [];
        (request as any).defaults.adapter = async (aConfig: any) => {
            sSent.push(aConfig.headers.Authorization);
            if (aConfig.headers.Authorization === 'Bearer old') return unauthorized(aConfig);
            return { status: 200, statusText: 'OK', headers: {}, config: aConfig, data: { ok: aConfig.url } };
        };

        const sResults = await Promise.all([1, 2, 3, 4].map((aN) => request({ method: 'POST', url: '/api/rpc', data: { n: aN } })));

        expect(reLogin).toHaveBeenCalledTimes(1);
        expect(localStorage.getItem('accessToken')).toBe('new');
        expect(sSent.filter((aAuth) => aAuth === 'Bearer new')).toHaveLength(4);
        expect(sResults).toEqual([1, 2, 3, 4].map(() => ({ ok: '/api/rpc' })));
    });

    it('a relogin that fails on the network ends in one "Session expired" notice, not a TypeError', async () => {
        localStorage.setItem('accessToken', 'old');
        // The editor's request layer resolves a network failure as the AxiosError itself.
        (reLogin as jest.Mock).mockResolvedValue(new AxiosError('Network Error', 'ERR_NETWORK'));
        (request as any).defaults.adapter = async (aConfig: any) => unauthorized(aConfig);

        const sResults = await Promise.allSettled([1, 2, 3, 4].map((aN) => request({ method: 'POST', url: '/api/rpc', data: { n: aN } })));

        expect(sResults.every((aResult) => aResult.status === 'fulfilled')).toBe(true);
        expect(Toast.error).toHaveBeenCalledTimes(1);
        expect(Toast.error).toHaveBeenCalledWith('Session expired. Please log in again.');
    });
});
