import { resetCurrentDatabase, setCurrentDatabase } from '@/utils/currentDatabaseState';
import {
    findRollupTableEntry,
    formatRollupIntervalList,
    formatRollupRangeLabel,
    getPanelSeriesRollupColumn,
    getPanelSeriesRollupInfo,
    getPanelSeriesValueSummaryLabel,
    type RollupTableMap,
} from './rollupMetadata';

describe('rollup metadata lookup', () => {
    beforeEach(() => setCurrentDatabase({ id: '1', name: 'FACTORY_A' }));
    afterEach(() => resetCurrentDatabase());

    it('uses the qualified database and never borrows a foreign database bare-table entry', () => {
        const current = { VALUE: [{ intervalMs: 1_000, supportsFirstLast: false }] };
        const foreign = { VALUE: [{ intervalMs: 60_000, supportsFirstLast: true }] };
        const metadata = { SYS: { 'FACTORY_A.TAG': current, 'FACTORY_B.TAG': foreign, TAG: current } };

        expect(findRollupTableEntry(metadata, 'FACTORY_B.SYS.TAG')).toBe(foreign);
        expect(findRollupTableEntry(metadata, 'FACTORY_C.SYS.TAG')).toBeUndefined();
    });

    it('prefers current-database qualified metadata and retains case-compatible legacy fallback', () => {
        const qualified = { VALUE: [{ intervalMs: 60_000, supportsFirstLast: false }] };
        const legacy = { VALUE: [{ intervalMs: 1_000, supportsFirstLast: false }] };
        const metadata = { SYS: { 'FACTORY_A.TAG': qualified, TAG: legacy } };

        expect(findRollupTableEntry(metadata, 'tag')).toBe(qualified);
        expect(findRollupTableEntry(metadata, 'sys.tag')).toBe(qualified);
        expect(findRollupTableEntry(metadata, 'factory_a.sys.tag')).toBe(qualified);
        expect(findRollupTableEntry({ SYS: { TAG: legacy } }, 'factory_a.sys.tag')).toBe(legacy);
        expect(findRollupTableEntry(undefined, 'TAG')).toBeUndefined();
    });

    it('prefers a JSON-path rollup and sorts its intervals without changing catalogue order', () => {
        const definitions = [
            { intervalMs: 60_000, supportsFirstLast: true },
            { intervalMs: 1_000, supportsFirstLast: false },
            { intervalMs: 5_000, supportsFirstLast: false },
        ];
        const metadata: RollupTableMap = { SYS: { 'FACTORY_A.TAG': {
            'PAYLOAD->$temperature': definitions,
            PAYLOAD: [{ intervalMs: 3_600_000, supportsFirstLast: false }],
        } } };

        const info = getPanelSeriesRollupInfo(metadata, 'TAG', 'PAYLOAD', '$.temperature');

        expect(info).toEqual({
            columnName: 'PAYLOAD->$temperature',
            intervals: [1_000, 5_000, 60_000],
            minimumInterval: 1_000,
            maximumInterval: 60_000,
        });
        expect(definitions.map(({ intervalMs }) => intervalMs)).toEqual([60_000, 1_000, 5_000]);
        expect(getPanelSeriesRollupColumn(metadata, 'TAG', 'PAYLOAD', '$.temperature')).toBe('PAYLOAD->$temperature');
        expect(getPanelSeriesValueSummaryLabel(metadata, 'TAG', 'PAYLOAD', '$.temperature')).toBe('Has Rollup');
        expect(formatRollupRangeLabel(info!)).toBe('1s - 1min');
    });

    it('falls back from an empty JSON-path rollup to the base column', () => {
        const metadata: RollupTableMap = { SYS: { 'FACTORY_A.TAG': {
            'PAYLOAD->$temperature': [],
            PAYLOAD: [{ intervalMs: 5_000, supportsFirstLast: false }],
        } } };

        expect(getPanelSeriesRollupColumn(metadata, 'TAG', 'PAYLOAD', '$.temperature')).toBe('PAYLOAD');
        expect(getPanelSeriesRollupInfo(metadata, 'TAG', 'MISSING')).toBeUndefined();
        expect(getPanelSeriesValueSummaryLabel(metadata, 'TAG', 'MISSING')).toBe('No Rollup');
        expect(getPanelSeriesValueSummaryLabel(undefined, 'TAG', 'PAYLOAD')).toBeUndefined();
        expect(getPanelSeriesValueSummaryLabel(metadata, '', 'PAYLOAD')).toBeUndefined();
        expect(getPanelSeriesValueSummaryLabel(metadata, 'TAG', '')).toBeUndefined();
    });

    it('formats supported intervals and collapses a single interval range', () => {
        expect(formatRollupIntervalList([500, 1_000, 60_000, 3_600_000, 86_400_000, 31_536_000_000]))
            .toBe('500ms, 1s, 1min, 1h, 1d, 1y');
        expect(formatRollupIntervalList([])).toBe('');
        expect(formatRollupRangeLabel({
            columnName: 'VALUE', intervals: [5_000], minimumInterval: 5_000, maximumInterval: 5_000,
        })).toBe('5s');
    });
});
