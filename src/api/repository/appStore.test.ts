import { fetchPkgHubList, filterExperimentPkgs, isGrandfatheredPkg, type APP_INFO } from './appStore';

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

describe('fetchPkgHubList — source selection and experiment passthrough', () => {
    const fetchMock = jest.fn();

    beforeEach(() => {
        fetchMock.mockReset();
        global.fetch = fetchMock as unknown as typeof fetch;
    });

    test('reads packages-all.json, not the legacy view', async () => {
        fetchMock.mockResolvedValueOnce(okResponse([hubEntry('a')]));
        await fetchPkgHubList();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(ALL_URL);
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
        expect(fetchMock).toHaveBeenNthCalledWith(1, ALL_URL);
        expect(fetchMock).toHaveBeenNthCalledWith(2, LEGACY_URL);
        expect(res.map((p) => p.experiment)).toEqual([expected]);
        expect(filterExperimentPkgs(res, false)).toHaveLength(1);
    });

    test('falls back when packages-all.json is not an array', async () => {
        fetchMock.mockResolvedValueOnce(okResponse({ oops: true })).mockResolvedValueOnce(okResponse([hubEntry('a')]));
        const res = await fetchPkgHubList();
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(res.map((p) => p.name)).toEqual(['a']);
    });

    test('throws when both sources fail — caller keeps its existing catch', async () => {
        fetchMock.mockResolvedValueOnce(notFound()).mockResolvedValueOnce(notFound());
        await expect(fetchPkgHubList()).rejects.toThrow('Failed to fetch pkg hub: 404');
    });

    test('release-less experiment package maps to empty versions[] without throwing', async () => {
        fetchMock.mockResolvedValueOnce(okResponse([hubEntry('gated', { experiment: true, version: null, released_at: null, versions: [] })]));
        const [entry] = await fetchPkgHubList();
        expect(entry.experiment).toBe(true);
        expect(entry.versions).toEqual([]);
        expect(entry.latest_version).toBe('');
    });
});
