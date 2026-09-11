import {
    fetchPkgHubList,
    isPkgHubBackedOff,
    mapHubEntry,
    resetPkgHubBackoff,
    HUB_BACKOFF_MESSAGE,
    HUB_FAILURE_BACKOFF_MS,
    HUB_FETCH_TIMEOUT_MS,
    type PkgHubEntry,
} from './appStore';

const HUB_URL = 'https://raw.githubusercontent.com/machbase/neo-pkg-hub/main/packages.json';

// Minimal hub payload entry — mirrors the shape sync.sh publishes.
const hubEntry = (name: string, over: Record<string, unknown> = {}) => ({
    name,
    description: 'desc',
    version: '1.0.0',
    icon: null,
    docs: null,
    homepage: null,
    github: {
        organization: 'machbase',
        repo: name,
        full_name: `machbase/${name}`,
        html_url: '',
        default_branch: 'main',
        language: 'TypeScript',
        license: null,
        stargazers_count: 0,
        forks_count: 0,
    },
    released_at: '2026-01-01T00:00:00Z',
    versions: [{ version: '1.0.0', minServer: '8.5.0', released_at: '2026-01-01T00:00:00Z' }],
    ...over,
});

const okResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const notFound = () => ({ ok: false, status: 404, json: async () => ({}) });

describe('mapHubEntry — shared mapper for hub and local-archive entries (issue #1452)', () => {
    // The offline merge feeds local index entries through this same function.
    // `description` lives at the top level of the source entry but nested under
    // `github` on the card model; a separate mapper drops it and the App Store
    // search filter (index.tsx:101) then throws on `.toLowerCase()` of undefined.
    test('local-archive shaped entry gets github.description populated', () => {
        const local = { ...hubEntry('offline-pkg', { description: 'from a local zip' }), archive: 'offline-pkg-1.0.0.zip', sha256: 'a'.repeat(64) };
        const mapped = mapHubEntry(local as unknown as PkgHubEntry);
        expect(mapped.github.description).toBe('from a local zip');
        // The search filter's actual call site — must not throw.
        expect(() => mapped.github.description.toLowerCase()).not.toThrow();
    });

    test('synthesizes a single-element versions[] when the entry has none (legacy shape)', () => {
        const mapped = mapHubEntry(hubEntry('legacy', { versions: undefined }) as unknown as PkgHubEntry);
        expect(mapped.versions).toEqual([{ version: '1.0.0', minServer: '', released_at: '2026-01-01T00:00:00Z' }]);
        expect(mapped.latest_version).toBe('1.0.0');
    });
});

// Every hub request now carries an AbortController signal (issue #1452).
const withSignal = { signal: expect.anything() };

describe('fetchPkgHubList', () => {
    const fetchMock = jest.fn();

    beforeEach(() => {
        fetchMock.mockReset();
        global.fetch = fetchMock as unknown as typeof fetch;
        // Module-level failure window — must not leak between tests.
        resetPkgHubBackoff();
    });

    // packages.json is the released-only list, so reading it IS the rule "what is
    // not released is not in the catalog". packages-all.json must never be read.
    test('reads packages.json — one request, never packages-all.json', async () => {
        fetchMock.mockResolvedValueOnce(okResponse([hubEntry('a')]));
        await fetchPkgHubList();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(HUB_URL, withSignal);
        expect(fetchMock.mock.calls.some(([url]) => String(url).includes('packages-all.json'))).toBe(false);
    });

    test('rejects a payload that is not an array, and backs off', async () => {
        fetchMock.mockResolvedValueOnce(okResponse({ oops: true }));
        await expect(fetchPkgHubList()).rejects.toThrow(/Malformed pkg hub payload/);
        expect(isPkgHubBackedOff()).toBe(true);
    });

    // NEW CONTRACT (issue #1452). A rejection here means "the hub leg is
    // unavailable", NOT "the catalog is empty": `buildCatalog` treats this as one
    // settled source of three and still renders /pkg-archives + /public. The
    // usable-catalog-without-a-hub case is proven end to end in
    // `src/components/side/AppStore/catalog.test.ts`.
    test('rejects when the hub fails, and marks it as backed off', async () => {
        fetchMock.mockResolvedValueOnce(notFound());
        await expect(fetchPkgHubList()).rejects.toThrow('Failed to fetch pkg hub: 404');
        expect(isPkgHubBackedOff()).toBe(true);
    });

    test('a successful fetch clears a previous failure window', async () => {
        fetchMock.mockResolvedValueOnce(notFound());
        await expect(fetchPkgHubList()).rejects.toThrow();
        expect(isPkgHubBackedOff()).toBe(true);

        resetPkgHubBackoff(); // what the Refresh button does
        fetchMock.mockResolvedValueOnce(okResponse([hubEntry('a')]));
        await expect(fetchPkgHubList()).resolves.toHaveLength(1);
        expect(isPkgHubBackedOff()).toBe(false);
    });

    // On an air-gapped host `fetch` to raw.githubusercontent does not fail — it
    // hangs. The catalog is rebuilt on a 500ms search debounce, so without the
    // abort deadline AND the failure backoff every keystroke would stall the panel.
    describe('offline hardening (issue #1452)', () => {
        // Rejects only once the request is aborted — a stand-in for a black-holed
        // connection that never answers.
        const hangUntilAborted = () =>
            fetchMock.mockImplementation(
                (_url: string, init: { signal: AbortSignal }) =>
                    new Promise((_resolve, reject) => {
                        init.signal.addEventListener('abort', () => reject(new Error('AbortError: fetch aborted')));
                    })
            );

        beforeEach(() => jest.useFakeTimers());
        afterEach(() => jest.useRealTimers());

        test('a hung fetch is aborted at the deadline instead of hanging forever', async () => {
            hangUntilAborted();
            const pending = fetchPkgHubList();
            const assertion = expect(pending).rejects.toThrow(/abort/i);

            await jest.advanceTimersByTimeAsync(HUB_FETCH_TIMEOUT_MS);
            expect(fetchMock).toHaveBeenCalledTimes(1);

            await assertion;
        });

        test('the next call fails immediately from the backoff — no second stall per keystroke', async () => {
            hangUntilAborted();
            const assertion = expect(fetchPkgHubList()).rejects.toThrow();
            await jest.advanceTimersByTimeAsync(HUB_FETCH_TIMEOUT_MS);
            await assertion;

            fetchMock.mockClear();
            await expect(fetchPkgHubList()).rejects.toThrow(HUB_BACKOFF_MESSAGE);
            expect(fetchMock).not.toHaveBeenCalled(); // never touched the network

            // …and the hub is retried once the window closes.
            jest.advanceTimersByTime(HUB_FAILURE_BACKOFF_MS);
            fetchMock.mockReset();
            fetchMock.mockResolvedValueOnce(okResponse([hubEntry('a')]));
            await expect(fetchPkgHubList()).resolves.toHaveLength(1);
        });

        test('Refresh (resetPkgHubBackoff) bypasses the window without waiting it out', async () => {
            hangUntilAborted();
            const assertion = expect(fetchPkgHubList()).rejects.toThrow();
            await jest.advanceTimersByTimeAsync(HUB_FETCH_TIMEOUT_MS);
            await assertion;

            resetPkgHubBackoff();
            fetchMock.mockReset();
            fetchMock.mockResolvedValueOnce(okResponse([hubEntry('a')]));
            await expect(fetchPkgHubList()).resolves.toHaveLength(1);
        });
    });

    test('a release-less entry maps to empty versions[] without throwing', async () => {
        fetchMock.mockResolvedValueOnce(okResponse([hubEntry('bare', { version: null, released_at: null, versions: [] })]));
        const [entry] = await fetchPkgHubList();
        expect(entry.versions).toEqual([]);
        expect(entry.latest_version).toBe('');
    });
});
