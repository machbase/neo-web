import { buildNeoUpdateStatus, fetchLatestNeoVersion, normalizeNeoVersion, NEO_UPDATE_URL } from './neoUpdate';

const mockFetch = jest.fn();

describe('normalizeNeoVersion', () => {
    test('normalizes plain version', () => {
        expect(normalizeNeoVersion('8.5.2')).toBe('v8.5.2');
    });

    test('keeps v-prefix version', () => {
        expect(normalizeNeoVersion('v8.5.2')).toBe('v8.5.2');
    });

    test('rejects invalid or missing version', () => {
        expect(normalizeNeoVersion(undefined)).toBeNull();
        expect(normalizeNeoVersion('')).toBeNull();
        expect(normalizeNeoVersion('8.5')).toBeNull();
        expect(normalizeNeoVersion('not-a-version')).toBeNull();
    });
});

describe('buildNeoUpdateStatus', () => {
    test('returns update-available when latest is newer', () => {
        expect(buildNeoUpdateStatus('v8.5.2', 'v8.5.6', 1)).toEqual({
            state: 'update-available',
            currentVersion: 'v8.5.2',
            latestVersion: 'v8.5.6',
            checkedAt: 1,
        });
    });

    test('returns latest when versions are equal', () => {
        expect(buildNeoUpdateStatus('8.5.6', 'v8.5.6', 1)).toEqual({
            state: 'latest',
            currentVersion: 'v8.5.6',
            latestVersion: 'v8.5.6',
            checkedAt: 1,
        });
    });

    test('skips invalid current version', () => {
        expect(buildNeoUpdateStatus('not-a-version', 'v8.5.6', 1)).toEqual({
            state: 'idle',
            checkedAt: 1,
        });
    });

    test('reports invalid latest version as error', () => {
        expect(buildNeoUpdateStatus('v8.5.2', 'not-a-version', 1)).toEqual({
            state: 'error',
            currentVersion: 'v8.5.2',
            checkedAt: 1,
            error: 'Invalid latest version',
        });
    });
});

describe('fetchLatestNeoVersion', () => {
    beforeEach(() => {
        global.fetch = mockFetch as unknown as typeof fetch;
    });

    afterEach(() => {
        mockFetch.mockReset();
    });

    test('fetches latest version for normalized current version', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ latest: 'v8.5.6' }),
        });

        await expect(fetchLatestNeoVersion('8.5.2')).resolves.toBe('v8.5.6');
        expect(mockFetch).toHaveBeenCalledWith(`${NEO_UPDATE_URL}/v8.5.2`);
    });

    test('rejects malformed latest response', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ latest: 'bad' }),
        });

        await expect(fetchLatestNeoVersion('v8.5.2')).rejects.toThrow('Invalid latest version');
    });

    test('rejects invalid current version before fetch', async () => {
        await expect(fetchLatestNeoVersion('bad')).rejects.toThrow('Invalid current version');
        expect(mockFetch).not.toHaveBeenCalled();
    });
});
