import { createBlockBaseMinMaxFetcher } from '@/utils/dashboardBaseMinMax';

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

describe('the base min/max reader runs on whichever transport it was built with', () => {
    test('a block is read through the injected fetcher, not a hardcoded one', async () => {
        const sFetchTimeMinMax = jest.fn().mockResolvedValue([[1000, 138000]]);
        const sFetchMountTimeMinMax = jest.fn();
        const sRead = createBlockBaseMinMaxFetcher({ fetchTimeMinMax: sFetchTimeMinMax, fetchMountTimeMinMax: sFetchMountTimeMinMax });

        await expect(sRead(distanceBlock)).resolves.toEqual({ min: 1000, max: 138000 });
        expect(sFetchTimeMinMax).toHaveBeenCalledTimes(1);
        expect(sFetchMountTimeMinMax).not.toHaveBeenCalled();
    });

    test('a mounted table goes to the mount fetcher of that same transport', async () => {
        const sFetchTimeMinMax = jest.fn();
        const sFetchMountTimeMinMax = jest.fn().mockResolvedValue([[0, 4990]]);
        const sRead = createBlockBaseMinMaxFetcher({ fetchTimeMinMax: sFetchTimeMinMax, fetchMountTimeMinMax: sFetchMountTimeMinMax });

        await expect(sRead({ ...distanceBlock, table: 'MOUNTED.SYS.DISTANCE_SENSOR' })).resolves.toEqual({ min: 0, max: 4990 });
        expect(sFetchMountTimeMinMax).toHaveBeenCalledTimes(1);
        expect(sFetchTimeMinMax).not.toHaveBeenCalled();
    });

    test('a failed read is undefined rather than a made-up extent', async () => {
        const sRead = createBlockBaseMinMaxFetcher({ fetchTimeMinMax: jest.fn().mockResolvedValue([[null, null]]), fetchMountTimeMinMax: jest.fn() });
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
