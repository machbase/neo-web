import { AxiosError } from 'axios';
import { getFileRequestFailure } from './fileRequestResult';

describe('getFileRequestFailure', () => {
    it('success body → null', () => {
        expect(getFileRequestFailure({ success: true, reason: 'success', data: {} })).toBeNull();
    });
    it('success:false body → server failure with reason', () => {
        expect(getFileRequestFailure({ success: false, reason: 'permission denied' })).toEqual({ reason: 'permission denied', transport: false });
    });
    it('HTTP error response (error.response) → reason from data.reason', () => {
        const sRes = { status: 409, statusText: 'Conflict', headers: {}, config: {}, data: { success: false, reason: 'destination exists' } };
        expect(getFileRequestFailure(sRes)).toEqual({ reason: 'destination exists', transport: false });
    });
    it('HTTP error response with a string body is parsed', () => {
        const sRes = { status: 500, statusText: 'Internal', headers: {}, data: '{"success":false,"reason":"boom"}' };
        expect(getFileRequestFailure(sRes)).toEqual({ reason: 'boom', transport: false });
    });
    it('AxiosError (network) → transport failure', () => {
        const sErr = new AxiosError('Network Error', 'ERR_NETWORK');
        expect(getFileRequestFailure(sErr)).toEqual({ reason: 'Network Error', transport: true });
    });
    it('undefined → transport failure with fallback', () => {
        expect(getFileRequestFailure(undefined, 'fallback')).toEqual({ reason: 'fallback', transport: true });
    });
    it('image ArrayBuffer body → success', () => {
        expect(getFileRequestFailure(new ArrayBuffer(8))).toBeNull();
    });
    it('text body → success', () => {
        expect(getFileRequestFailure('SELECT 1')).toBeNull();
    });
});

describe('getFileRequestFailure — ArrayBuffer error body (r20 L5)', () => {
    it('an image-path error body arriving as bytes is decoded for the server reason', () => {
        const sBytes = new TextEncoder().encode('{"success":false,"reason":"mkdir /x/a.png: file exists"}');
        const sRes = { status: 500, statusText: 'Internal Server Error', headers: {}, data: sBytes.buffer.slice(sBytes.byteOffset, sBytes.byteOffset + sBytes.byteLength) };
        expect(getFileRequestFailure(sRes)).toEqual({ reason: 'mkdir /x/a.png: file exists', transport: false });
    });
    it('a non-JSON byte body falls back to statusText', () => {
        const sBytes = new TextEncoder().encode('oops');
        const sRes = { status: 502, statusText: 'Bad Gateway', headers: {}, data: sBytes.buffer.slice(0, sBytes.byteLength) };
        expect(getFileRequestFailure(sRes)).toEqual({ reason: 'Bad Gateway', transport: false });
    });
});
