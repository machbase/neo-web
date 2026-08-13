import {
    fetchPkgHubList,
    filterExperimentPkgs,
    isGrandfatheredPkg,
    isPkgHubBackedOff,
    mapHubEntry,
    resetPkgHubBackoff,
    HUB_BACKOFF_MESSAGE,
    HUB_FAILURE_BACKOFF_MS,
    HUB_FETCH_TIMEOUT_MS,
    type APP_INFO,
    type PkgHubEntry,
} from './appStore';

const ALL_URL = 'https://raw.githubusercontent.com/machbase/neo-pkg-hub/main/packages-all.json';
const LEGACY_URL = 'https://raw.githubusercontent.com/machbase/neo-pkg-hub/main/packages.json';

const pkg = (name: string, over: Partial<APP_INFO> = {}): APP_INFO =>
    ({
        name,
        latest_version: '1.0.0',
        published_at: '',
        github: {
            organization: 'machbase',
            repo: name,
            full_name: `machbase/${name}`,
            description: '',
            default_branch: 'main',
            forks_count: 0,
            language: 'TypeScript',
            stargazers_count: 0,
            license: null,
        },
        ...over,
    }) as APP_INFO;

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

describe('filterExperimentPkgs — catalog visibility gate (issue #1438)', () => {
    test('experiment:true + mode ON → shown', () => {
        expect(filterExperimentPkgs([pkg('a', { experiment: true })], true).map((p) => p.name)).toEqual(['a']);
    });

    test('experiment:true + mode OFF → hidden', () => {
        expect(filterExperimentPkgs([pkg('a', { experiment: true })], false)).toEqual([]);
    });

    test('experiment:false → shown regardless of mode', () => {
        const list = [pkg('a', { experiment: false })];
        expect(filterExperimentPkgs(list, true)).toHaveLength(1);
        expect(filterExperimentPkgs(list, false)).toHaveLength(1);
    });

    test('experiment undefined (legacy fallback entry) → shown regardless of mode', () => {
        const list = [pkg('a')];
        expect(filterExperimentPkgs(list, true)).toHaveLength(1);
        expect(filterExperimentPkgs(list, false)).toHaveLength(1);
    });

    // The exemption exists because allPkgs is derived from the hub list alone —
    // dropping the entry would erase the only card offering uninstall/stop.
    test('experiment:true + mode OFF + installed → SHOWN (uninstall path preserved)', () => {
        const list = [pkg('a', { experiment: true, installed_frontend: true })];
        expect(filterExperimentPkgs(list, false).map((p) => p.name)).toEqual(['a']);
    });

    test('experiment:true + mode OFF + installed_frontend false → hidden', () => {
        expect(filterExperimentPkgs([pkg('a', { experiment: true, installed_frontend: false })], false)).toEqual([]);
    });

    test('empty list → empty list', () => {
        expect(filterExperimentPkgs([], false)).toEqual([]);
        expect(filterExperimentPkgs([], true)).toEqual([]);
    });

    test('mixed list keeps order and drops only gated entries', () => {
        const list = [
            pkg('stable-1', { experiment: false }),
            pkg('gated', { experiment: true }),
            pkg('legacy'),
            pkg('gated-installed', { experiment: true, installed_frontend: true }),
        ];
        expect(filterExperimentPkgs(list, false).map((p) => p.name)).toEqual(['stable-1', 'legacy', 'gated-installed']);
        expect(filterExperimentPkgs(list, true).map((p) => p.name)).toEqual(['stable-1', 'gated', 'legacy', 'gated-installed']);
    });
});

describe('isGrandfatheredPkg — visible only because installed', () => {
    // Full truth table over (experiment, mode, installed).
    const cases: Array<[boolean, boolean, boolean, boolean]> = [
        // experiment, experimentOn, installed, expected
        [true, false, true, true], // the only grandfathered combination
        [true, false, false, false],
        [true, true, true, false],
        [true, true, false, false],
        [false, false, true, false],
        [false, false, false, false],
        [false, true, true, false],
        [false, true, false, false],
    ];

    test.each(cases)('experiment=%s on=%s installed=%s → %s', (experiment, on, installed, expected) => {
        expect(isGrandfatheredPkg(pkg('a', { experiment, installed_frontend: installed }), on)).toBe(expected);
    });

    test('undefined experiment is never grandfathered', () => {
        expect(isGrandfatheredPkg(pkg('a', { installed_frontend: true }), false)).toBe(false);
    });

    test('null / undefined package → false (no crash)', () => {
        expect(isGrandfatheredPkg(undefined, false)).toBe(false);
        expect(isGrandfatheredPkg(null, false)).toBe(false);
    });
});

// Every hub request now carries an AbortController signal (issue #1452).
const withSignal = { signal: expect.anything() };

describe('fetchPkgHubList — source selection and experiment passthrough', () => {
    const fetchMock = jest.fn();

    beforeEach(() => {
        fetchMock.mockReset();
        global.fetch = fetchMock as unknown as typeof fetch;
        // Module-level failure window — must not leak between tests.
        resetPkgHubBackoff();
    });

    test('reads packages-all.json, not the legacy view', async () => {
        fetchMock.mockResolvedValueOnce(okResponse([hubEntry('a')]));
        await fetchPkgHubList();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(ALL_URL, withSignal);
    });

    test('preserves experiment true / false / undefined through the mapping', async () => {
        fetchMock.mockResolvedValueOnce(
            okResponse([hubEntry('gated', { experiment: true }), hubEntry('stable', { experiment: false }), hubEntry('legacy')])
        );
        const res = await fetchPkgHubList();
        expect(res.map((p) => p.experiment)).toEqual([true, false, undefined]);
    });

    // The real legacy view still publishes `experiment: false` on every entry — its
    // entry schema is identical to packages-all.json by design. A hub predating the
    // gate omits the key entirely. Both must read as ungated.
    test.each([
        ['current hub (experiment: false present)', { experiment: false }, false],
        ['pre-gate hub (key absent)', {}, undefined],
    ])('falls back to packages.json — %s', async (_label, extra, expected) => {
        fetchMock.mockResolvedValueOnce(notFound()).mockResolvedValueOnce(okResponse([hubEntry('a', extra)]));
        const res = await fetchPkgHubList();
        expect(fetchMock).toHaveBeenNthCalledWith(1, ALL_URL, withSignal);
        expect(fetchMock).toHaveBeenNthCalledWith(2, LEGACY_URL, withSignal);
        expect(res.map((p) => p.experiment)).toEqual([expected]);
        expect(filterExperimentPkgs(res, false)).toHaveLength(1);
    });

    test('falls back when packages-all.json is not an array', async () => {
        fetchMock.mockResolvedValueOnce(okResponse({ oops: true })).mockResolvedValueOnce(okResponse([hubEntry('a')]));
        const res = await fetchPkgHubList();
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(res.map((p) => p.name)).toEqual(['a']);
    });

    // NEW CONTRACT (issue #1452). A rejection here means "the hub leg is
    // unavailable", NOT "the catalog is empty": `buildCatalog` treats this as one
    // settled source of three and still renders /pkg-archives + /public. The
    // usable-catalog-without-a-hub case is proven end to end in
    // `src/components/side/AppStore/catalog.test.ts`.
    test('rejects when both sources fail, and marks the hub as backed off', async () => {
        fetchMock.mockResolvedValueOnce(notFound()).mockResolvedValueOnce(notFound());
        await expect(fetchPkgHubList()).rejects.toThrow('Failed to fetch pkg hub: 404');
        expect(isPkgHubBackedOff()).toBe(true);
    });

    test('a successful fetch clears a previous failure window', async () => {
        fetchMock.mockResolvedValueOnce(notFound()).mockResolvedValueOnce(notFound());
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

            // packages-all.json gets its own budget, then the legacy fallback.
            await jest.advanceTimersByTimeAsync(HUB_FETCH_TIMEOUT_MS);
            expect(fetchMock).toHaveBeenCalledTimes(2);
            await jest.advanceTimersByTimeAsync(HUB_FETCH_TIMEOUT_MS);

            await assertion;
        });

        test('the next call fails immediately from the backoff — no second stall per keystroke', async () => {
            hangUntilAborted();
            const assertion = expect(fetchPkgHubList()).rejects.toThrow();
            await jest.advanceTimersByTimeAsync(HUB_FETCH_TIMEOUT_MS * 2);
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
            await jest.advanceTimersByTimeAsync(HUB_FETCH_TIMEOUT_MS * 2);
            await assertion;

            resetPkgHubBackoff();
            fetchMock.mockReset();
            fetchMock.mockResolvedValueOnce(okResponse([hubEntry('a')]));
            await expect(fetchPkgHubList()).resolves.toHaveLength(1);
        });
    });

    test('release-less experiment package maps to empty versions[] without throwing', async () => {
        fetchMock.mockResolvedValueOnce(okResponse([hubEntry('gated', { experiment: true, version: null, released_at: null, versions: [] })]));
        const [entry] = await fetchPkgHubList();
        expect(entry.experiment).toBe(true);
        expect(entry.versions).toEqual([]);
        expect(entry.latest_version).toBe('');
    });
});
