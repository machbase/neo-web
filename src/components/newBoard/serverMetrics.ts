import { fetchQuery } from '@/api/repository/database';

/**
 * The server's own runtime metrics: machbase-neo writes one row per metric per minute into this
 * transaction table from the moment it starts (`NAME VARCHAR(100)`, `TIME DATETIME`,
 * `VALUE DOUBLE`), so even a server nobody has used yet has something to chart.
 *
 * Named in full because it lives in MACHBASEDB whichever logical database the session is on.
 */
export const STATZ_TABLE = 'MACHBASEDB.SYS._NEO_STATZ';

export interface ServerMetric {
    name: string;
    label: string;
    unit: string;
    decimals: number;
    color: string;
}

export const PULSE_METRICS: ServerMetric[] = [
    { name: 'sys:append:data:success', label: 'Rows appended', unit: '/ min', decimals: 0, color: '#0075e2' },
    { name: 'ps:cpu_percent', label: 'CPU', unit: '%', decimals: 1, color: '#3fb8af' },
    { name: 'ps:mem_percent', label: 'Memory', unit: '%', decimals: 1, color: '#b48ef0' },
];

export interface MetricPoint {
    time: number;
    value: number;
}

export interface ServerPulse {
    series: Record<string, MetricPoint[]>;
    metricCount: number;
    /** Oldest row in the table, epoch ms. */
    recordingSince: number | undefined;
}

const PULSE_WINDOW = '1h';

/** Server times arrive as epoch nanoseconds, or as text when a time format is configured. */
export const toEpochMs = (aTime: unknown): number => {
    if (aTime === null || aTime === undefined || typeof aTime === 'boolean') return NaN;
    if (typeof aTime === 'number') return aTime > 1e15 ? aTime / 1e6 : aTime;
    const sNumber = Number(aTime);
    if (Number.isFinite(sNumber) && String(aTime).trim() !== '') return toEpochMs(sNumber);
    return Date.parse(String(aTime));
};

export const buildPulseSeriesQuery = (aMetrics: ServerMetric[] = PULSE_METRICS) =>
    `SELECT NAME, TIME, VALUE FROM ${STATZ_TABLE} WHERE NAME IN (${aMetrics.map((aMetric) => `'${aMetric.name}'`).join(', ')}) AND TIME > NOW - ${PULSE_WINDOW} ORDER BY TIME`;

export const parsePulseRows = (aRows: unknown[][] = [], aMetrics: ServerMetric[] = PULSE_METRICS): Record<string, MetricPoint[]> => {
    const sSeries: Record<string, MetricPoint[]> = Object.fromEntries(aMetrics.map((aMetric) => [aMetric.name, []]));
    for (const [sName, sTime, sValue] of aRows) {
        const sPoints = sSeries[String(sName)];
        // A NULL reading is a gap, not a zero.
        const sNumber = sValue === null || sValue === undefined || sValue === '' ? NaN : Number(sValue);
        const sEpoch = toEpochMs(sTime);
        if (sPoints && Number.isFinite(sNumber) && Number.isFinite(sEpoch)) sPoints.push({ time: sEpoch, value: sNumber });
    }
    return sSeries;
};

/** Resolves to undefined when the metrics cannot be read (an account without access to SYS tables). */
export const fetchServerPulse = async (): Promise<ServerPulse | undefined> => {
    const [sSeriesRes, sCountRes, sSinceRes] = await Promise.all([
        fetchQuery(buildPulseSeriesQuery()),
        fetchQuery(`SELECT COUNT(DISTINCT NAME) FROM ${STATZ_TABLE} WHERE TIME > NOW - 10m`),
        fetchQuery(`SELECT MIN(TIME) FROM ${STATZ_TABLE}`),
    ]);
    if (!sSeriesRes.svrState) return undefined;
    const sSince = sSinceRes.svrState ? toEpochMs(sSinceRes.svrData?.rows?.[0]?.[0]) : NaN;
    return {
        series: parsePulseRows(sSeriesRes.svrData?.rows),
        metricCount: sCountRes.svrState ? Number(sCountRes.svrData?.rows?.[0]?.[0]) || 0 : 0,
        recordingSince: Number.isFinite(sSince) ? sSince : undefined,
    };
};
