// #1576: links that open without a login (/web/ui/board, /db/tql/<path>) get 401 when the server's HTTP token
// auth is on. Whether they work is asked once, the way such a link asks: POST /db/tql with no headers.

const loadFresh = (): typeof import('./shareAvailability') => {
    let sModule: typeof import('./shareAvailability');
    jest.isolateModules(() => {
        sModule = require('./shareAvailability');
    });
    return sModule!;
};

const mockFetch = (aImpl: () => Promise<unknown>) => {
    const sFetch = jest.fn(aImpl);
    (global as any).fetch = sFetch;
    return sFetch;
};

afterEach(() => {
    delete (global as any).fetch;
});

describe('checkShareAvailable', () => {
    it('200 → available', async () => {
        mockFetch(() => Promise.resolve({ status: 200 }));
        await expect(loadFresh().checkShareAvailable()).resolves.toBe(true);
    });

    it.each([401, 403, 404, 500])('%i → not available', async (aStatus) => {
        mockFetch(() => Promise.resolve({ status: aStatus }));
        await expect(loadFresh().checkShareAvailable()).resolves.toBe(false);
    });

    it('a network error → not available', async () => {
        mockFetch(() => Promise.reject(new TypeError('Failed to fetch')));
        await expect(loadFresh().checkShareAvailable()).resolves.toBe(false);
    });

    it('no fetch at all → not available, without throwing', async () => {
        await expect(loadFresh().checkShareAvailable()).resolves.toBe(false);
    });

    it('asks the way a shared link does: POST /db/tql, a TQL that reads no database, no headers', async () => {
        const sFetch = mockFetch(() => Promise.resolve({ status: 200 }));
        await loadFresh().checkShareAvailable();
        expect(sFetch).toHaveBeenCalledWith('/db/tql', { method: 'POST', body: 'FAKE(once(1))\nCSV()' });
    });

    it('asks once, however many callers', async () => {
        const sFetch = mockFetch(() => Promise.resolve({ status: 401 }));
        const { checkShareAvailable, getKnownShareAvailable } = loadFresh();
        expect(getKnownShareAvailable()).toBeUndefined();
        const sAnswers = await Promise.all([checkShareAvailable(), checkShareAvailable(), checkShareAvailable()]);
        await checkShareAvailable();
        expect(sAnswers).toEqual([false, false, false]);
        expect(getKnownShareAvailable()).toBe(false);
        expect(sFetch).toHaveBeenCalledTimes(1);
    });
});
