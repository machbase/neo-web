import { createBlockBaseMinMaxFetcher } from '@/utils/dashboardBaseMinMax';
import { createBlockTimeMinMaxFetcher } from '@/utils/dashboardTimeMinMax';
import { resetCurrentDatabase, setDatabases } from '@/utils/currentDatabaseState';

/**
 * The public dashboard is unauthenticated: it queries `/db/query`, while the editor sends the
 * session's bearer token to `/web/api/query`. Reading a block's extent through the editor's fetcher
 * from the public view therefore answers 401 — and on a distance axis that means the `first`/`last`
 * edges cannot be resolved and the panel quietly renders the whole range instead of the window.
 *
 * This pins the seam rather than the endpoint string: the logic is shared, the transport is injected.
 */
const distanceBlock = {
    id: 'b1',
    type: 'tag',
    table: 'SYS.DISTANCE_SENSOR',
    userName: 'SYS',
    tag: 'SENSOR_06',
    name: 'NAME',
    time: 'ODOMETER_M',
    value: 'VALUE',
    timeBaseTime: true,
    timeType: 20,
    filter: [],
    tableInfo: [
        ['NAME', 5, 0, 0, 0],
        ['ODOMETER_M', 20, 0, 0, 0x01000000],
        ['VALUE', 20, 0, 0, 0],
    ],
};

const V87_CATALOGUE = [
    { id: '1', name: 'MACHBASEDB', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: true },
    { id: '2', name: 'MOUNTED', kind: 'MOUNTED', accessMode: 'READ_ONLY', isDefault: false },
];

/**
 * A resolver stand-in that fills the catalogue only once awaited, as the real one does.
 *
 * The `await` inside is what makes this a test rather than a tautology: an async function runs
 * synchronously up to its first suspension point, so a body that called `setDatabases` directly
 * would populate the catalogue even for a caller that never awaited it — which is precisely the
 * bug. Yielding once first means only a real `await` sees the rows.
 */
const settledCatalogue = () =>
    jest.fn(async () => {
        await Promise.resolve();
        setDatabases(V87_CATALOGUE);
    });

const buildRead = (aFetchTimeMinMax: any, aFetchMountTimeMinMax: any, aEnsure: any = jest.fn()) =>
    createBlockBaseMinMaxFetcher(
        createBlockTimeMinMaxFetcher({ ensureCurrentDatabase: aEnsure, fetchTimeMinMax: aFetchTimeMinMax, fetchMountTimeMinMax: aFetchMountTimeMinMax })
    );

describe('the base min/max reader runs on whichever transport it was built with', () => {
    beforeEach(() => resetCurrentDatabase());
    test('a block is read through the injected fetcher, not a hardcoded one', async () => {
        const sFetchTimeMinMax = jest.fn().mockResolvedValue([[1000, 138000]]);
        const sFetchMountTimeMinMax = jest.fn();
        const sRead = buildRead(sFetchTimeMinMax, sFetchMountTimeMinMax);

        await expect(sRead(distanceBlock)).resolves.toEqual({ min: 1000, max: 138000 });
        expect(sFetchTimeMinMax).toHaveBeenCalledTimes(1);
        expect(sFetchMountTimeMinMax).not.toHaveBeenCalled();
    });

    test('a mounted table goes to the mount fetcher of that same transport', async () => {
        // Which database a name points into is a catalogue fact, not a dot count. Since v8.7
        // every table name carries all three parts, so counting them would send ordinary tables
        // down the mount path — and a mounted database has no V$<TABLE>_STAT view to read.
        setDatabases(V87_CATALOGUE);
        const sFetchTimeMinMax = jest.fn();
        const sFetchMountTimeMinMax = jest.fn().mockResolvedValue([[0, 4990]]);
        const sRead = buildRead(sFetchTimeMinMax, sFetchMountTimeMinMax);

        await expect(sRead({ ...distanceBlock, table: 'MOUNTED.SYS.DISTANCE_SENSOR' })).resolves.toEqual({ min: 0, max: 4990 });
        expect(sFetchMountTimeMinMax).toHaveBeenCalledTimes(1);
        expect(sFetchTimeMinMax).not.toHaveBeenCalled();
    });

    test('the catalogue is awaited before the mount decision, not read from an empty list', async () => {
        // The bug this guards: `isMountedTableName` reads the catalogue synchronously while the
        // catalogue arrives from an async probe. A caller that branched before awaiting saw an
        // empty list, read every table as unmounted, and sent a mounted one to V$<TABLE>_STAT —
        // which does not exist there. `/view/*` hit this on first paint every time.
        const sEnsure = settledCatalogue();
        const sFetchTimeMinMax = jest.fn();
        const sFetchMountTimeMinMax = jest.fn().mockResolvedValue([[0, 4990]]);
        const sRead = buildRead(sFetchTimeMinMax, sFetchMountTimeMinMax, sEnsure);

        await expect(sRead({ ...distanceBlock, table: 'MOUNTED.SYS.DISTANCE_SENSOR' })).resolves.toEqual({ min: 0, max: 4990 });
        expect(sEnsure).toHaveBeenCalled();
        expect(sFetchMountTimeMinMax).toHaveBeenCalledTimes(1);
        expect(sFetchTimeMinMax).not.toHaveBeenCalled();
    });

    test('a fully qualified table in an active database still uses the statistics view', async () => {
        // The regression this guards: with names always three parts, a dot count would route
        // MACHBASEDB.SYS.DISTANCE_SENSOR to the scanning fetcher instead of V$..._STAT.
        setDatabases(V87_CATALOGUE);
        const sFetchTimeMinMax = jest.fn().mockResolvedValue([[1000, 138000]]);
        const sFetchMountTimeMinMax = jest.fn();
        const sRead = buildRead(sFetchTimeMinMax, sFetchMountTimeMinMax);

        await expect(sRead({ ...distanceBlock, table: 'MACHBASEDB.SYS.DISTANCE_SENSOR' })).resolves.toEqual({ min: 1000, max: 138000 });
        expect(sFetchTimeMinMax).toHaveBeenCalledTimes(1);
        expect(sFetchMountTimeMinMax).not.toHaveBeenCalled();
    });

    test('a failed read is undefined rather than a made-up extent', async () => {
        const sRead = buildRead(jest.fn().mockResolvedValue([[null, null]]), jest.fn());
        await expect(sRead(distanceBlock)).resolves.toBeUndefined();
    });

    test('the public view builds it over its own unauthenticated transport', async () => {
        // Importing the module is the assertion: it must resolve against this tree's api repository.
        const sPublic = await import('./dashboardBaseMinMax');
        const sEditor = await import('@/utils/dashboardBaseMinMax');
        expect(typeof sPublic.fetchBlockBaseMinMax).toBe('function');
        expect(sPublic.fetchBlockBaseMinMax).not.toBe(sEditor.fetchBlockBaseMinMax);
    });
});
