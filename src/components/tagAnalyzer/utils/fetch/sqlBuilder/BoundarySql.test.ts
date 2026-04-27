import { buildGroupedSeriesTimeBoundarySql } from './BuildGroupedSeriesTimeBoundarySql';
import { buildVirtualStatOrMountedTableBoundarySql } from './BuildVirtualStatOrMountedTableBoundarySql';

describe('BoundarySql', () => {
    it('builds stat-table boundary SQL from grouped table info', () => {
        expect(buildGroupedSeriesTimeBoundarySql([
            {
                table: 'APP.TAG_TABLE',
                tags: ['TAG_1', 'TAG_2'],
                cols: {
                    name: 'NAME',
                    time: 'TIME',
                    value: 'VALUE',
                },
            },
        ] as any)).toBe(
            "SELECT MIN(min_time) AS min_tm, MAX(max_time) AS max_tm FROM APP.v$TAG_TABLE_stat WHERE NAME IN ('TAG_1','TAG_2')",
        );
    });

    it('builds virtual-stat boundary SQL from a mounted table target', () => {
        expect(buildVirtualStatOrMountedTableBoundarySql(
            'MOUNT.APP.TAG_TABLE',
            ['TAG_1'],
            {
                sourceColumns: {
                    time: 'TS',
                },
            } as any,
        )).toBe(
            'SELECT MIN(TS), MAX(TS) FROM MOUNT.APP.TAG_TABLE',
        );
    });
});
