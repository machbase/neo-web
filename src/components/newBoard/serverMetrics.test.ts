import { buildPulseSeriesQuery, parsePulseRows, PULSE_METRICS, STATZ_TABLE, toEpochMs } from './serverMetrics';

jest.mock('@/api/repository/database', () => ({ fetchQuery: jest.fn() }));

describe('toEpochMs', () => {
    it('reads the nanosecond epoch the query API returns', () => {
        expect(toEpochMs(1790813400000000000)).toBe(1790813400000);
        expect(toEpochMs('1790813400000000000')).toBe(1790813400000);
    });

    it('keeps a millisecond epoch and parses formatted text', () => {
        expect(toEpochMs(1790813400000)).toBe(1790813400000);
        expect(toEpochMs('2026-10-01T00:50:00Z')).toBe(Date.parse('2026-10-01T00:50:00Z'));
    });

    it('answers NaN for something that is not a time', () => {
        expect(toEpochMs(null)).toBeNaN();
        expect(toEpochMs('')).toBeNaN();
    });
});

describe('buildPulseSeriesQuery', () => {
    it('names the table in full so it works from any logical database', () => {
        const sQuery = buildPulseSeriesQuery();
        expect(sQuery).toContain(`FROM ${STATZ_TABLE}`);
        expect(STATZ_TABLE).toBe('MACHBASEDB.SYS._NEO_STATZ');
        PULSE_METRICS.forEach((aMetric) => expect(sQuery).toContain(`'${aMetric.name}'`));
    });
});

describe('parsePulseRows', () => {
    it('groups rows by metric in arrival order', () => {
        const sSeries = parsePulseRows([
            ['ps:cpu_percent', 1790813400000000000, 12.5],
            ['ps:mem_percent', 1790813400000000000, 74.4],
            ['ps:cpu_percent', 1790813460000000000, 13],
        ]);
        expect(sSeries['ps:cpu_percent']).toEqual([
            { time: 1790813400000, value: 12.5 },
            { time: 1790813460000, value: 13 },
        ]);
        expect(sSeries['ps:mem_percent']).toHaveLength(1);
        expect(sSeries['sys:append:data:success']).toEqual([]);
    });

    it('drops metrics it did not ask for and values that are not numbers', () => {
        const sSeries = parsePulseRows([
            ['http:count', 1790813400000000000, 3],
            ['ps:cpu_percent', 1790813400000000000, null],
            ['ps:cpu_percent', 'not a time', 4],
        ]);
        expect(Object.keys(sSeries)).not.toContain('http:count');
        expect(sSeries['ps:cpu_percent']).toEqual([]);
    });
});
