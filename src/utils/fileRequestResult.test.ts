import { AxiosError } from 'axios';
import { getChartRequestFailureReason, getFileRequestFailure } from './fileRequestResult';

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

describe('getChartRequestFailureReason (#1565)', () => {
    it('a drawn chart is not a failure', () => {
        expect(getChartRequestFailureReason({ status: 200, statusText: 'OK', headers: {}, data: { chartID: 'c' } })).toBeNull();
        // the public board's own fetch wrapper
        expect(getChartRequestFailureReason({ status: 200, headers: {}, success: true, data: { chartID: 'c' } })).toBeNull();
    });
    it('keeps the reason of a refused query in a 200 body', () => {
        expect(getChartRequestFailureReason({ status: 200, headers: {}, data: { success: false, reason: 'no such table' } })).toBe('no such table');
    });
    it('reads the reason of an HTTP error the editor receives as text', () => {
        expect(getChartRequestFailureReason({ status: 500, statusText: 'Internal Server Error', headers: {}, data: '{"success":false,"reason":"busy"}' })).toBe('busy');
    });
    it('reads the reason of an HTTP error on the public board', () => {
        expect(getChartRequestFailureReason({ success: false, status: 500, statusText: 'Internal Server Error', headers: {}, data: '{"success":false,"reason":"busy"}' })).toBe('busy');
        expect(getChartRequestFailureReason({ success: false, status: 502, statusText: 'Bad Gateway', headers: {}, data: '<html>' })).toBe('Bad Gateway');
    });
    it('reports a request that never reached the server', () => {
        expect(getChartRequestFailureReason(new AxiosError('Network Error', 'ERR_NETWORK'))).toBe('Network Error');
        expect(getChartRequestFailureReason({ success: false, data: { reason: 'Network error: TypeError: Failed to fetch' } })).toBe('Network error: TypeError: Failed to fetch');
        expect(getChartRequestFailureReason(undefined)).toBe('Failed to load the chart.');
    });
});
