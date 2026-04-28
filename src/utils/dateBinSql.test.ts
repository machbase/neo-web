import { DashboardQueryParser } from './DashboardQueryParser';
import { DashboardQueryParser as PublicDashboardQueryParser } from '../public-dashboard/utils/DashboardQueryParser';
import { isRollup, isRollupExt } from './index';
import {
    buildRawTimeExpression,
    buildRollupAwareAggregationSql,
    buildRollupBoundaryExpression,
    createRollupAggregationMetric,
} from './rollupQueryBuilder';
import { ROLLUP_EXT_TYPE_BY_COLUMN } from './rollupColumnCandidates';

const expectNoLegacyBucketSql = (sql: string) => {
    expect(sql).not.toContain('DATE_TRUNC(');
    expect(sql).not.toContain('FROM_TIMESTAMP(-32400000000000)');
    expect(sql).not.toContain('FROM_TIMESTAMP(0)');
    expect(sql).not.toMatch(/DATE_BIN\([^)]*DATE_BIN\('day', 1,/);
};

const createBlock = (overrides: Record<string, any> = {}) => ({
    id: 'block-1',
    table: 'EXAMPLE',
    customTable: false,
    customFullTyping: {
        use: false,
        text: '',
    },
    time: 'TIME',
    type: 'tag',
    userName: 'sys',
    name: 'NAME',
    tag: 'wave.sin',
    value: 'VALUE',
    aggregator: 'avg',
    alias: "'SERIES(0)'",
    diff: 'none',
    useCustom: false,
    filter: [
        {
            column: 'NAME',
            operator: 'in',
            value: 'wave.sin',
            useFilter: true,
        },
    ],
    values: [],
    color: '#000000',
    tableInfo: [
        ['NAME', 5],
        ['TIME', 6],
        ['VALUE', 20],
    ],
    math: '',
    isValidMath: true,
    duration: {
        from: '',
        to: '',
    },
    isVisible: true,
    ...overrides,
});

const createTime = (intervalType: string, intervalValue: number) => ({
    interval: {
        IntervalType: intervalType,
        IntervalValue: intervalValue,
    },
    start: 1745910581000,
    end: 1745914181000,
});

const createNumericTime = (intervalType: string, intervalValue: number) => ({
    interval: {
        IntervalType: intervalType,
        IntervalValue: intervalValue,
    },
    start: 1000,
    end: 2000,
});

const getSqlFromParser = (parser: typeof DashboardQueryParser, block: Record<string, any>, intervalType: string, intervalValue: number, rollupList = {}) => {
    const [queries] = parser('line', 'TIME_VALUE' as any, [block], [], rollupList, [], createTime(intervalType, intervalValue));
    return queries[0].sql;
};

describe('DATE_BIN SQL generation', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test.each([
        ['sec', 11, "DATE_BIN('second', 11, TIME)"],
        ['min', 7, "DATE_BIN('minute', 7, TIME)"],
        ['hour', 5, "DATE_BIN('hour', 5, TIME)"],
        ['day', 1, "DATE_BIN('day', 1, TIME)"],
    ])('raw time bucket uses 3-argument DATE_BIN for %s', (intervalType, intervalValue, expected) => {
        const sql = buildRawTimeExpression('TIME', intervalType, intervalValue);

        expect(sql).toBe(expected);
        expectNoLegacyBucketSql(sql);
    });

    test('split rollup query keeps ROLLUP and uses originless DATE_BIN for the raw tail', () => {
        const sql = buildRollupAwareAggregationSql({
            sourceMode: 'split',
            tableName: 'SYS.EXAMPLE',
            timeColumn: 'TIME',
            timeRange: {
                start: 1,
                end: 2,
            },
            intervalType: 'hour',
            intervalValue: 5,
            metrics: [
                createRollupAggregationMetric({
                    aggregator: 'avg',
                    outputAlias: 'VALUE',
                    valueExpression: 'VALUE',
                }),
            ],
        });

        expect(sql).toContain("ROLLUP('HOUR', 5, TIME)");
        expect(sql).toContain("DATE_BIN('hour', 5, TIME)");
        expect(sql).toContain("DATE_BIN('hour', 5, sysdate)");
        expectNoLegacyBucketSql(sql);
    });

    test('rollup boundary uses originless DATE_BIN', () => {
        const sql = buildRollupBoundaryExpression('min', 7);

        expect(sql).toContain("DATE_BIN('minute', 7, sysdate)");
        expectNoLegacyBucketSql(sql);
    });

    test('dashboard parser emits 3-argument DATE_BIN for raw aggregation', () => {
        const sql = getSqlFromParser(DashboardQueryParser, createBlock(), 'min', 7);

        expect(sql).toContain("DATE_BIN('minute', 7, TIME)");
        expectNoLegacyBucketSql(sql);
    });

    test('dashboard parser keeps non-datetime basetime range in the original unit', () => {
        const [queries] = DashboardQueryParser(
            'line',
            'TIME_VALUE' as any,
            [
                createBlock({
                    time: 'ODOMETER_M',
                    tableInfo: [
                        ['NAME', 5, 0, 0, 0],
                        ['ODOMETER_M', 20, 0, 1, 0x01000000],
                        ['VALUE', 20, 0, 2, 0],
                    ],
                }),
            ],
            [],
            {},
            [],
            createNumericTime('min', 7)
        );
        const sql = queries[0].sql;

        expect(sql).toContain('ODOMETER_M BETWEEN 1000 AND 2000');
        expect(sql).not.toContain('ODOMETER_M BETWEEN 1000000000 AND 2000000000');
        expect(sql).not.toContain('TO_TIMESTAMP(ODOMETER_M)');
        expect(sql).not.toContain('ODOMETER_M / 1000000');
    });

    test('dashboard parser converts JSON value before avg aggregation', () => {
        const sql = getSqlFromParser(
            DashboardQueryParser,
            createBlock({
                value: 'PAYLOAD',
                jsonKey: 'metrics.temperature',
                tableInfo: [
                    ['NAME', 5],
                    ['TIME', 6],
                    ['PAYLOAD', 61],
                ],
            }),
            'min',
            7
        );

        expect(sql).toContain("sum(TO_NUMBER_SAFE(PAYLOAD->'$[metrics][temperature]'))");
        expect(sql).not.toContain('sum(PAYLOAD)');
        expect(sql).not.toContain("sum(PAYLOAD->'$[metrics][temperature]')");
    });

    test('dashboard parser uses a single rollup query without raw tail union', () => {
        const rollupList = {
            SYS: {
                EXAMPLE: {
                    VALUE: [420000],
                    EXT_TYPE: [0],
                },
            },
        };

        const sql = getSqlFromParser(DashboardQueryParser, createBlock(), 'min', 7, rollupList);

        expect(sql).toContain("ROLLUP('MIN', 7, TIME)");
        expect(sql).not.toContain('UNION ALL');
        expectNoLegacyBucketSql(sql);
    });

    test('dashboard parser checks every JSON rollup candidate until the interval matches', () => {
        const rollupList = {
            SYS: {
                SENSOR_JSON_RAW: {
                    PAYLOAD: [300000],
                    'PAYLOAD->$metrics.temperature': [420000],
                    EXT_TYPE: [0],
                },
            },
        };

        const sql = getSqlFromParser(
            DashboardQueryParser,
            createBlock({
                table: 'SENSOR_JSON_RAW',
                value: 'PAYLOAD',
                jsonKey: 'metrics.temperature',
                tableInfo: [
                    ['NAME', 5],
                    ['TIME', 6],
                    ['PAYLOAD', 61],
                ],
            }),
            'min',
            7,
            rollupList
        );

        expect(isRollup(rollupList, 'SENSOR_JSON_RAW', 420000, 'PAYLOAD', 'metrics.temperature')).toBe(true);
        expect(sql).toContain("ROLLUP('MIN', 7, TIME)");
        expect(sql).not.toContain('UNION ALL');
    });

    test('dashboard parser extracts JSON key outside a base JSON rollup', () => {
        const rollupList = {
            SYS: {
                SENSOR_JSON_RAW: {
                    PAYLOAD: [420000],
                    EXT_TYPE: [0],
                },
            },
        };

        const sql = getSqlFromParser(
            DashboardQueryParser,
            createBlock({
                table: 'SENSOR_JSON_RAW',
                value: 'PAYLOAD',
                jsonKey: 'metrics.temperature',
                tableInfo: [
                    ['NAME', 5],
                    ['TIME', 6],
                    ['PAYLOAD', 61],
                ],
            }),
            'min',
            7,
            rollupList
        );

        expect(isRollup(rollupList, 'SENSOR_JSON_RAW', 420000, 'PAYLOAD', 'metrics.temperature')).toBe(true);
        expect(sql).toContain("ROLLUP('MIN', 7, TIME)");
        expect(sql).toContain('avg(PAYLOAD) as JSONVAL_VALUE');
        expect(sql).toContain("MAX(TO_NUMBER_SAFE(JSONVAL_VALUE->'$[metrics][temperature]')) AS VALUE");
        expect(sql).not.toContain("sum(TO_NUMBER_SAFE(PAYLOAD->'$[metrics][temperature]'))");
        expect(sql).not.toContain('UNION ALL');
    });

    test('dashboard parser prefers a JSON path rollup when both base and path rollups match', () => {
        const rollupList = {
            SYS: {
                SENSOR_JSON_RAW: {
                    PAYLOAD: [420000],
                    'PAYLOAD->$metrics.temperature': [420000],
                    EXT_TYPE: [0, 0],
                },
            },
        };

        const sql = getSqlFromParser(
            DashboardQueryParser,
            createBlock({
                table: 'SENSOR_JSON_RAW',
                value: 'PAYLOAD',
                jsonKey: 'metrics.temperature',
                tableInfo: [
                    ['NAME', 5],
                    ['TIME', 6],
                    ['PAYLOAD', 61],
                ],
            }),
            'min',
            7,
            rollupList
        );

        expect(sql).toContain("sum(TO_NUMBER_SAFE(PAYLOAD->'$[metrics][temperature]'))");
        expect(sql).not.toContain('avg(PAYLOAD) as JSONVAL_VALUE');
    });

    test('dashboard parser does not extract JSON key from count base JSON rollup', () => {
        const rollupList = {
            SYS: {
                SENSOR_JSON_RAW: {
                    PAYLOAD: [420000],
                    EXT_TYPE: [0],
                },
            },
        };

        const sql = getSqlFromParser(
            DashboardQueryParser,
            createBlock({
                table: 'SENSOR_JSON_RAW',
                value: 'PAYLOAD',
                jsonKey: 'metrics.temperature',
                aggregator: 'count',
                tableInfo: [
                    ['NAME', 5],
                    ['TIME', 6],
                    ['PAYLOAD', 61],
                ],
            }),
            'min',
            7,
            rollupList
        );

        expect(sql).toContain('count(PAYLOAD) as VALUE');
        expect(sql).toContain('SUM(VALUE) AS VALUE');
        expect(sql).not.toContain("JSONVAL_VALUE->'$[metrics][temperature]'");
    });

    test('rollup ext type is read from the matched column interval', () => {
        const rollupList = {
            SYS: {
                EXAMPLE: {
                    OTHER: [420000],
                    VALUE: [420000],
                    EXT_TYPE: [0, 0],
                    [ROLLUP_EXT_TYPE_BY_COLUMN]: {
                        OTHER: [0],
                        VALUE: [1],
                    },
                },
            },
        };

        expect(isRollupExt(rollupList, 'EXAMPLE', 420000, 'VALUE')).toBe(1);
    });

    test('dashboard parser emits 3-argument DATE_BIN for first/last without ext rollup', () => {
        const block = createBlock({
            aggregator: 'first',
            values: [],
        });
        const rollupList = {
            SYS: {
                EXAMPLE: {
                    VALUE: [420000],
                    EXT_TYPE: [0],
                },
            },
        };

        const sql = getSqlFromParser(DashboardQueryParser, block, 'min', 7, rollupList);

        expect(sql).toContain("DATE_BIN('minute', 7, TIME)");
        expectNoLegacyBucketSql(sql);
    });

    test('public dashboard parser emits 3-argument DATE_BIN for raw aggregation', () => {
        const sql = getSqlFromParser(PublicDashboardQueryParser, createBlock(), 'hour', 5);

        expect(sql).toContain("DATE_BIN('hour', 5, TIME)");
        expectNoLegacyBucketSql(sql);
    });

    test('public dashboard parser keeps non-datetime basetime range in the original unit', () => {
        const [queries] = PublicDashboardQueryParser(
            'line',
            'TIME_VALUE' as any,
            [
                createBlock({
                    time: 'ODOMETER_M',
                    tableInfo: [
                        ['NAME', 5, 0, 0, 0],
                        ['ODOMETER_M', 20, 0, 1, 0x01000000],
                        ['VALUE', 20, 0, 2, 0],
                    ],
                }),
            ],
            [],
            {},
            [],
            createNumericTime('min', 7)
        );
        const sql = queries[0].sql;

        expect(sql).toContain('ODOMETER_M BETWEEN 1000 AND 2000');
        expect(sql).not.toContain('ODOMETER_M BETWEEN 1000000000 AND 2000000000');
        expect(sql).not.toContain('TO_TIMESTAMP(ODOMETER_M)');
        expect(sql).not.toContain('ODOMETER_M / 1000000');
    });

    test('public dashboard parser uses a single rollup query without raw tail union', () => {
        const rollupList = {
            SYS: {
                EXAMPLE: {
                    VALUE: [420000],
                    EXT_TYPE: [0],
                },
            },
        };

        const sql = getSqlFromParser(PublicDashboardQueryParser, createBlock(), 'min', 7, rollupList);

        expect(sql).toContain("ROLLUP('MIN', 7, TIME)");
        expect(sql).not.toContain('UNION ALL');
        expectNoLegacyBucketSql(sql);
    });

    test('public dashboard parser converts JSON value before avg aggregation', () => {
        const sql = getSqlFromParser(
            PublicDashboardQueryParser,
            createBlock({
                value: 'PAYLOAD',
                jsonKey: 'metrics.temperature',
                tableInfo: [
                    ['NAME', 5],
                    ['TIME', 6],
                    ['PAYLOAD', 61],
                ],
            }),
            'min',
            7
        );

        expect(sql).toContain("sum(TO_NUMBER_SAFE(PAYLOAD->'$[metrics][temperature]'))");
        expect(sql).not.toContain('sum(PAYLOAD)');
        expect(sql).not.toContain("sum(PAYLOAD->'$[metrics][temperature]')");
    });

    test('public dashboard parser checks every JSON rollup candidate until the interval matches', () => {
        const rollupList = {
            SYS: {
                SENSOR_JSON_RAW: {
                    PAYLOAD: [300000],
                    'PAYLOAD->$metrics.temperature': [420000],
                    EXT_TYPE: [0],
                },
            },
        };

        const sql = getSqlFromParser(
            PublicDashboardQueryParser,
            createBlock({
                table: 'SENSOR_JSON_RAW',
                value: 'PAYLOAD',
                jsonKey: 'metrics.temperature',
                tableInfo: [
                    ['NAME', 5],
                    ['TIME', 6],
                    ['PAYLOAD', 61],
                ],
            }),
            'min',
            7,
            rollupList
        );

        expect(sql).toContain("ROLLUP('MIN', 7, TIME)");
        expect(sql).not.toContain('UNION ALL');
    });

    test('public dashboard parser extracts JSON key outside a base JSON rollup', () => {
        const rollupList = {
            SYS: {
                SENSOR_JSON_RAW: {
                    PAYLOAD: [420000],
                    EXT_TYPE: [0],
                },
            },
        };

        const sql = getSqlFromParser(
            PublicDashboardQueryParser,
            createBlock({
                table: 'SENSOR_JSON_RAW',
                value: 'PAYLOAD',
                jsonKey: 'metrics.temperature',
                tableInfo: [
                    ['NAME', 5],
                    ['TIME', 6],
                    ['PAYLOAD', 61],
                ],
            }),
            'min',
            7,
            rollupList
        );

        expect(sql).toContain("ROLLUP('MIN', 7, TIME)");
        expect(sql).toContain('avg(PAYLOAD) as JSONVAL_VALUE');
        expect(sql).toContain("MAX(TO_NUMBER_SAFE(JSONVAL_VALUE->'$[metrics][temperature]')) AS VALUE");
        expect(sql).not.toContain("sum(TO_NUMBER_SAFE(PAYLOAD->'$[metrics][temperature]'))");
        expect(sql).not.toContain('UNION ALL');
    });
});
