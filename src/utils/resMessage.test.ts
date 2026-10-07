import { resMessage } from './resMessage';

const FALLBACK = 'Failed to do the thing';

describe('resMessage', () => {
    it('reads the top-level reason (key.ts / token.ts shape)', () => {
        expect(resMessage({ success: false, reason: 'name already exists', elapse: '' }, FALLBACK)).toBe('name already exists');
    });

    it('reads the full envelope (bridge.ts / timer.ts / sshKey.ts errEnvelope shape)', () => {
        const sRes = { success: false, reason: 'bridge not found', elapse: '', data: { reason: 'bridge not found' }, statusText: 'bridge not found' };
        expect(resMessage(sRes, FALLBACK)).toBe('bridge not found');
    });

    it('falls back to data.reason when top-level reason is absent (shellRpcEnvelope shape)', () => {
        // api.ts `shellRpcEnvelope` deliberately omits top-level `reason` on error — the single
        // most likely way this helper silently returns nothing, so it gets its own case.
        const sRes = { success: false, elapse: '', statusText: 'command is required', data: { reason: 'command is required' } };
        expect(resMessage(sRes, FALLBACK)).toBe('command is required');
    });

    it('falls back to statusText when neither reason field is present', () => {
        expect(resMessage({ success: false, statusText: 'Network Error' }, FALLBACK)).toBe('Network Error');
    });

    it("never surfaces the success envelope's reason:'success'", () => {
        expect(resMessage({ success: true, reason: 'success', elapse: '' }, FALLBACK)).toBe(FALLBACK);
    });

    it('ignores blank and whitespace-only messages', () => {
        expect(resMessage({ success: false, reason: '' }, FALLBACK)).toBe(FALLBACK);
        expect(resMessage({ success: false, reason: '   ' }, FALLBACK)).toBe(FALLBACK);
    });

    it('ignores non-string messages', () => {
        expect(resMessage({ success: false, reason: 500 }, FALLBACK)).toBe(FALLBACK);
        expect(resMessage({ success: false, reason: { code: -32602 } }, FALLBACK)).toBe(FALLBACK);
    });

    it('trims surrounding whitespace off a real message', () => {
        expect(resMessage({ success: false, reason: '  timer not found\n' }, FALLBACK)).toBe('timer not found');
    });

    it('survives a missing / malformed response', () => {
        expect(resMessage(undefined, FALLBACK)).toBe(FALLBACK);
        expect(resMessage(null, FALLBACK)).toBe(FALLBACK);
        expect(resMessage({}, FALLBACK)).toBe(FALLBACK);
    });
});
