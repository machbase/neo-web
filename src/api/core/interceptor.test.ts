// The request interceptor decides "raw text file" GETs (transformResponse passthrough) and upload Content-Type
// from the URL. It used indexOf('.sql') etc. on the whole path (case-sensitive, any segment); it now uses the
// last segment's extension lower-cased, like the rest of the app (issue-1544 r10).

jest.mock('@/api/repository/login', () => ({ reLogin: jest.fn() }));
jest.mock('@/design-system/components', () => ({ Toast: { error: jest.fn(), success: jest.fn() } }));

import request from './index';

const runRequestInterceptor = (aConfig: any) => {
    const sHandlers = (request.interceptors.request as any).handlers.filter(Boolean);
    expect(sHandlers.length).toBeGreaterThan(0);
    return sHandlers[0].fulfilled({ headers: {}, ...aConfig });
};

const isPassthrough = (aConfig: any) => typeof aConfig.transformResponse === 'function' && aConfig.transformResponse('{"a":1}') === '{"a":1}';

describe('request interceptor — /api/files raw text detection', () => {
    it('passes an upper-case extension (X.DSH) through as raw text', () => {
        const sConfig = runRequestInterceptor({ url: '/api/files/d/X.DSH', method: 'get' });
        expect(isPassthrough(sConfig)).toBe(true);
        expect(sConfig.headers['Content-Type']).toBe('text/plain');
    });
    it('still passes a lower-case .sql through', () => {
        expect(isPassthrough(runRequestInterceptor({ url: '/api/files/d/a.sql', method: 'get' }))).toBe(true);
    });
    it('does not pass through when only a parent folder looks like a text file (/a.sql/b.json)', () => {
        const sConfig = runRequestInterceptor({ url: '/api/files/a.sql/b.json', method: 'get' });
        expect(isPassthrough(sConfig)).toBe(false);
    });
    it('does not pass through a directory listing with a trailing "/"', () => {
        expect(isPassthrough(runRequestInterceptor({ url: '/api/files/d/', method: 'get' }))).toBe(false);
        expect(isPassthrough(runRequestInterceptor({ url: '/api/files/x.sql/', method: 'get' }))).toBe(false);
    });
    it('keeps text/plain for a POST upload of x.SQL', () => {
        const sConfig = runRequestInterceptor({ url: '/api/files/d/x.SQL', method: 'post', data: 'SELECT 1' });
        expect(sConfig.headers['Content-Type']).toBe('text/plain');
    });
});

// r17/r18: URL download stores py/sh/htm/mjs/markdown/svg/images. Under the instance default 'application/json' axios
// JSON.stringify()s a string body, so the file was saved as a quoted JSON literal (measured on the real instance).
describe('request interceptor — POST Content-Type for the URL download extensions', () => {
    it.each([
        ['x.py', 'text/plain'],
        ['x.SH', 'text/plain'],
        ['x.htm', 'text/html'],
        ['x.mjs', 'text/javascript'],
        ['i.svg', 'image/svg+xml'],
        ['img.PNG', 'application/octet-stream'],
        // r18: the rest of the 29 server-file extensions
        ['r.markdown', 'text/plain'],
        ['a.apng', 'application/octet-stream'],
        ['x.AVIF', 'application/octet-stream'],
        ['scan.tiff', 'application/octet-stream'],
    ])('%s → %s', (aName, aType) => {
        const sConfig = runRequestInterceptor({ url: '/api/files/d/' + aName, method: 'post', data: 'x' });
        expect(sConfig.headers['Content-Type']).toBe(aType);
    });

    it('the real instance puts a .py string body on the wire unchanged', async () => {
        let sCaptured: any;
        const sAdapter = (request as any).defaults.adapter;
        (request as any).defaults.adapter = async (aConfig: any) => {
            sCaptured = aConfig;
            return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config: aConfig };
        };
        try {
            await request({ url: '/api/files/d/x.py', method: 'POST', data: 'print("hi")\n' });
            expect(sCaptured.data).toBe('print("hi")\n');
        } finally {
            (request as any).defaults.adapter = sAdapter;
        }
    });

    it('the real instance puts an .avif ArrayBuffer body on the wire unchanged (octet-stream)', async () => {
        let sCaptured: any;
        const sAdapter = (request as any).defaults.adapter;
        (request as any).defaults.adapter = async (aConfig: any) => {
            sCaptured = aConfig;
            return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config: aConfig };
        };
        try {
            const sBytes = new Uint8Array([0, 1, 2, 255]).buffer;
            await request({ url: '/api/files/d/x.avif', method: 'POST', data: sBytes });
            expect(sCaptured.data).toBe(sBytes);
            expect(sCaptured.headers['Content-Type']).toBe('application/octet-stream');
        } finally {
            (request as any).defaults.adapter = sAdapter;
        }
    });
});
