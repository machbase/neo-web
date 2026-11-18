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
import { getLogin } from '@/api/repository/login';
import { EXPERIMENT_CHANGE_EVENT } from '@/hooks/useExperiment';

// issue #1584: the hub file follows the server's experiment mode, asked through the
// login check on every fetch.
jest.mock('@/api/repository/login', () => ({ getLogin: jest.fn() }));
const mockCheck = getLogin as jest.MockedFunction<any>;

const HUB_URL = 'https://raw.githubusercontent.com/machbase/neo-pkg-hub/main/packages.json';
const HUB_ALL_URL = 'https://raw.githubusercontent.com/machbase/neo-pkg-hub/main/packages-all.json';
/** What `request` resolves /web/api/check with: the body on success… */
const checkAnswer = (experimentMode: boolean) => ({ success: true, reason: 'success', experimentMode });
/** …and the error response itself when the call failed (it does not reject). */
const checkFailure = () => ({ status: 500, data: { success: false, reason: 'boom' } });

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
        mockCheck.mockReset();
        mockCheck.mockResolvedValue(checkAnswer(false));
        localStorage.clear();
    });

    // issue #1584: which FILE is read is the rule. packages.json is the released-only
    // list; packages-all.json adds the packages still under validation, for
    // experiment-mode servers only. One request, to the chosen file.
    describe('the hub file follows the experiment mode (issue #1584)', () => {
        test('experiment mode ON → packages-all.json, one request', async () => {
            mockCheck.mockResolvedValue(checkAnswer(true));
            fetchMock.mockResolvedValueOnce(okResponse([hubEntry('a'), hubEntry('b', { experiment: true })]));
            await expect(fetchPkgHubList()).resolves.toHaveLength(2);
            expect(mockCheck).toHaveBeenCalledTimes(1);
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock).toHaveBeenCalledWith(HUB_ALL_URL, withSignal);
        });

        test('experiment mode OFF → packages.json, one request', async () => {
            localStorage.setItem('experimentMode', 'true'); // the server's answer wins over what was stored
            fetchMock.mockResolvedValueOnce(okResponse([hubEntry('a')]));
            await fetchPkgHubList();
            expect(mockCheck).toHaveBeenCalledTimes(1);
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock).toHaveBeenCalledWith(HUB_URL, withSignal);
        });

        test.each([
            ['an error response', checkFailure()],
            ['a network error', new Error('Network Error')],
            ['no answer at all', undefined],
        ])('the check failing (%s) → the last stored value picks the file, and stays', async (_label, answer) => {
            mockCheck.mockResolvedValue(answer);
            localStorage.setItem('experimentMode', 'true');
            fetchMock.mockResolvedValueOnce(okResponse([hubEntry('a')]));
            await fetchPkgHubList();
            expect(fetchMock).toHaveBeenLastCalledWith(HUB_ALL_URL, withSignal);
            expect(localStorage.getItem('experimentMode')).toBe('true');

            localStorage.setItem('experimentMode', 'false');
            fetchMock.mockResolvedValueOnce(okResponse([hubEntry('a')]));
            await fetchPkgHubList();
            expect(fetchMock).toHaveBeenLastCalledWith(HUB_URL, withSignal);
            expect(localStorage.getItem('experimentMode')).toBe('false');
        });

        test('a check that rejects (cancelled) also falls back to the stored value', async () => {
            mockCheck.mockRejectedValue(new Error('canceled'));
            localStorage.setItem('experimentMode', 'true');
            fetchMock.mockResolvedValueOnce(okResponse([hubEntry('a')]));
            await fetchPkgHubList();
            expect(fetchMock).toHaveBeenCalledWith(HUB_ALL_URL, withSignal);
        });

        test('the answer is stored the way the rest of the app stores it, and a change is announced', async () => {
            const heard = jest.fn();
            window.addEventListener(EXPERIMENT_CHANGE_EVENT, heard);
            localStorage.setItem('experimentMode', 'false');
            mockCheck.mockResolvedValue(checkAnswer(true));
            fetchMock.mockResolvedValue(okResponse([hubEntry('a')]));
            await fetchPkgHubList();
            expect(localStorage.getItem('experimentMode')).toBe('true');
            expect(heard).toHaveBeenCalledTimes(1);

            await fetchPkgHubList(); // same answer: stored again, nothing announced
            expect(heard).toHaveBeenCalledTimes(1);

            mockCheck.mockResolvedValue(checkAnswer(false));
            await fetchPkgHubList();
            expect(localStorage.getItem('experimentMode')).toBe('false');
            expect(heard).toHaveBeenCalledTimes(2);
            window.removeEventListener(EXPERIMENT_CHANGE_EVENT, heard);
        });

        test('while backed off, neither the server nor the hub is asked', async () => {
            fetchMock.mockResolvedValueOnce(notFound());
            await expect(fetchPkgHubList()).rejects.toThrow();
            mockCheck.mockClear();
            fetchMock.mockClear();

            await expect(fetchPkgHubList()).rejects.toThrow(HUB_BACKOFF_MESSAGE);
            expect(mockCheck).not.toHaveBeenCalled();
            expect(fetchMock).not.toHaveBeenCalled();
        });

        test.each([
            [true, HUB_ALL_URL],
            [false, HUB_URL],
        ])('the chosen file failing (experiment %s) is not retried with the other file', async (on, url) => {
            mockCheck.mockResolvedValue(checkAnswer(on));
            fetchMock.mockResolvedValueOnce(notFound());
            await expect(fetchPkgHubList()).rejects.toThrow('Failed to fetch pkg hub: 404');
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock).toHaveBeenCalledWith(url, withSignal);
            expect(isPkgHubBackedOff()).toBe(true);
        });
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
