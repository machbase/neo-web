import { checkPkgHealth } from './pkgHealth';

describe('checkPkgHealth — service_summary parsing', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
        jest.resetAllMocks();
        global.fetch = originalFetch;
    });

    const mockFetchJson = (body: unknown, init: { ok?: boolean; status?: number } = {}) => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: init.ok ?? true,
            status: init.status ?? 200,
            json: async () => body,
        }) as unknown as typeof fetch;
    };

    test('HTTP 200 with valid service_summary populates serviceSummary precisely', async () => {
        mockFetchJson({
            ok: true,
            data: {
                healthy: true,
                status: 'running',
                pid: 0,
                exit_code: null,
                error: '',
                service_summary: {
                    scope: 'replication',
                    total: 3,
                    running: 2,
                    errors: ['boom'],
                },
            },
        });

        const res = await checkPkgHealth('replication');

        expect(res.reachable).toBe(true);
        expect(res.running).toBe(true);
        expect(res.status).toBe('running');
        expect(res.serviceSummary).toEqual({
            scope: 'replication',
            total: 3,
            running: 2,
            errors: ['boom'],
        });
    });

    test('HTTP 200 without service_summary (legacy) leaves serviceSummary undefined', async () => {
        mockFetchJson({
            ok: true,
            data: { healthy: false, status: 'not_installed' },
        });

        const res = await checkPkgHealth('legacy-pkg');

        expect(res.reachable).toBe(true);
        expect(res.running).toBe(false);
        expect(res.status).toBe('not_installed');
        expect(res.serviceSummary).toBeUndefined();
    });

    test('HTTP 200 with service_summary missing errors defaults to empty array', async () => {
        mockFetchJson({
            ok: true,
            data: {
                healthy: true,
                status: 'running',
                service_summary: {
                    scope: 'opcua-client',
                    total: 1,
                    running: 1,
                    // errors omitted
                },
            },
        });

        const res = await checkPkgHealth('opcua-client');

        expect(res.serviceSummary).toBeDefined();
        expect(res.serviceSummary?.errors).toEqual([]);
        expect(res.serviceSummary?.total).toBe(1);
        expect(res.serviceSummary?.running).toBe(1);
    });

    test('service_summary.total is string → serviceSummary undefined (defensive)', async () => {
        mockFetchJson({
            ok: true,
            data: {
                healthy: true,
                service_summary: {
                    scope: 'replication',
                    total: '3',
                    running: 2,
                    errors: [],
                },
            },
        });

        const res = await checkPkgHealth('bad-total');

        expect(res.reachable).toBe(true);
        expect(res.serviceSummary).toBeUndefined();
    });

    test('service_summary.running is string → serviceSummary undefined (defensive)', async () => {
        mockFetchJson({
            ok: true,
            data: {
                healthy: true,
                service_summary: {
                    scope: 'replication',
                    total: 3,
                    running: '2',
                    errors: [],
                },
            },
        });

        const res = await checkPkgHealth('bad-running');

        expect(res.reachable).toBe(true);
        expect(res.serviceSummary).toBeUndefined();
    });

    test('service_summary.errors mixed [1, "a", null] → filters to ["a"]', async () => {
        mockFetchJson({
            ok: true,
            data: {
                healthy: true,
                service_summary: {
                    scope: 'replication',
                    total: 2,
                    running: 1,
                    errors: [1, 'a', null],
                },
            },
        });

        const res = await checkPkgHealth('mixed-errors');

        expect(res.serviceSummary?.errors).toEqual(['a']);
    });

    test('network error → reachable=false, serviceSummary undefined', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

        const res = await checkPkgHealth('offline');

        expect(res.reachable).toBe(false);
        expect(res.running).toBe(false);
        expect(res.serviceSummary).toBeUndefined();
    });
});
