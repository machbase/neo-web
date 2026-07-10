import request from '@/api/core';
import { ROLLUP_EXT_TYPE_BY_COLUMN } from '@/utils/rollupColumnCandidates';
import {
    fetchAllRollupTableInfo,
    findRollupTableEntry,
} from './RollupMetadata';

jest.mock('@/api/core', () => jest.fn());

const mockedRequest = request as jest.MockedFunction<typeof request>;

function createDeferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((resolver) => {
        resolve = resolver;
    });

    return { promise, resolve };
}

describe('fetchAllRollupTableInfo', () => {
    beforeEach(() => {
        mockedRequest.mockReset();
        localStorage.clear();
    });

    it('reuses in-flight and cached rollup metadata requests', async () => {
        const sRequest = createDeferred<unknown>();
        mockedRequest.mockReturnValueOnce(sRequest.promise);

        const sFirstRequest = fetchAllRollupTableInfo();
        const sSecondRequest = fetchAllRollupTableInfo();

        expect(mockedRequest).toHaveBeenCalledTimes(1);

        sRequest.resolve({
            data: {
                rows: [
                    ['SYS', 'MACHBASEDB.SENSOR', '1000', 'VALUE', '0'],
                ],
            },
        });

        const sExpectedMetadata = {
            SYS: {
                'MACHBASEDB.SENSOR': {
                    VALUE: ['1000'],
                    EXT_TYPE: ['0'],
                    [ROLLUP_EXT_TYPE_BY_COLUMN]: {
                        VALUE: ['0'],
                    },
                },
            },
        };

        await expect(sFirstRequest).resolves.toEqual(sExpectedMetadata);
        await expect(sSecondRequest).resolves.toEqual(sExpectedMetadata);
        expect(findRollupTableEntry(sExpectedMetadata, 'SYS.SENSOR')?.VALUE)
            .toEqual(['1000']);

        await expect(fetchAllRollupTableInfo()).resolves.toEqual(sExpectedMetadata);
        expect(mockedRequest).toHaveBeenCalledTimes(1);
    });
});
