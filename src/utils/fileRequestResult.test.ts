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
