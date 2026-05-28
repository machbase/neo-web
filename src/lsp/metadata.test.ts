import { loadLspMetadata, clearLspMetadataCache, getCachedLspMetadata } from './metadata';
import { getLspMetadata } from '@/api/repository/lsp';

jest.mock('@/api/repository/lsp', () => ({
    getLspMetadata: jest.fn(),
}));

const mockedGetLspMetadata = getLspMetadata as jest.MockedFunction<typeof getLspMetadata>;

describe('metadata.ts — loadLspMetadata cache + inflight dedup', () => {
    beforeEach(() => {
        clearLspMetadataCache();
        mockedGetLspMetadata.mockReset();
    });

    it('caches the resolved metadata so a second call does NOT hit the network', async () => {
        mockedGetLspMetadata.mockResolvedValueOnce({
            success: true,
            reason: 'success',
            data: { keywords: [{ name: 'SELECT' }] },
        } as any);

        const first = await loadLspMetadata('tql');
        const second = await loadLspMetadata('tql');

        expect(mockedGetLspMetadata).toHaveBeenCalledTimes(1);
        expect(first).toEqual({ keywords: [{ name: 'SELECT' }] });
        expect(second).toBe(first); // same cached reference
        expect(getCachedLspMetadata('tql')).toBe(first);
    });

    it('dedups concurrent calls into a single inflight request', async () => {
        let resolveFn: ((value: any) => void) | undefined;
        mockedGetLspMetadata.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveFn = resolve;
                }) as any
        );

        const p1 = loadLspMetadata('tql');
        const p2 = loadLspMetadata('tql');

        // Both callers should share the same inflight promise instance.
        expect(p1).toBe(p2);
        expect(mockedGetLspMetadata).toHaveBeenCalledTimes(1);

        resolveFn?.({
            success: true,
            reason: 'success',
            data: { keywords: [{ name: 'WHERE' }] },
        });

        const [r1, r2] = await Promise.all([p1, p2]);
        expect(r1).toEqual({ keywords: [{ name: 'WHERE' }] });
        expect(r2).toBe(r1);
    });

    it('does NOT cache on rejection; clears inflight; allows a later retry', async () => {
        mockedGetLspMetadata.mockRejectedValueOnce(new Error('boom'));

        await expect(loadLspMetadata('tql')).rejects.toThrow('boom');
        expect(getCachedLspMetadata('tql')).toBeUndefined();

        // Retry should issue a fresh network call (inflight was cleared).
        mockedGetLspMetadata.mockResolvedValueOnce({
            success: true,
            reason: 'success',
            data: { keywords: [{ name: 'RETRY' }] },
        } as any);

        const result = await loadLspMetadata('tql');
        expect(mockedGetLspMetadata).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ keywords: [{ name: 'RETRY' }] });
    });

    it('normalizes a server payload wrapped under data.metadata', async () => {
        mockedGetLspMetadata.mockResolvedValueOnce({
            success: true,
            reason: 'success',
            data: { metadata: { keywords: [{ name: 'WRAPPED' }] } },
        } as any);

        const result = await loadLspMetadata('sql');
        expect(result).toEqual({ keywords: [{ name: 'WRAPPED' }] });
    });

    it('clearLspMetadataCache(language) drops only that language', async () => {
        mockedGetLspMetadata
            .mockResolvedValueOnce({
                success: true,
                reason: 'success',
                data: { keywords: [{ name: 'A' }] },
            } as any)
            .mockResolvedValueOnce({
                success: true,
                reason: 'success',
                data: { keywords: [{ name: 'B' }] },
            } as any);

        await loadLspMetadata('tql');
        await loadLspMetadata('sql');

        clearLspMetadataCache('tql');
        expect(getCachedLspMetadata('tql')).toBeUndefined();
        expect(getCachedLspMetadata('sql')).toEqual({ keywords: [{ name: 'B' }] });
    });
});
