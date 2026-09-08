import { DashboardQueryParser } from './DashboardQueryParser';
import { DashboardQueryParser as PublicDashboardQueryParser } from '../public-dashboard/utils/DashboardQueryParser';

/**
 * SQL for the two expand-only table types, v8.7's TYPE 7 (view) and TYPE 8 (transaction).
 *
 * The shapes asserted here were run against a live v8.7 engine before being written down. Three
 * server facts drive the assertions:
 *   - `DURATION FROM ... TO ...` on either type answers `MACHCLI-ERR-2281`
 *   - `ROLLUP('HOUR', 1, TS)` answers `MACHCLI-ERR-2814` on a transaction table and
 *     `MACHCLI-ERR-2823` on a view
 *   - a filter clause with an empty column name (`AND  in ('dev-a')`) is a syntax error
 */

const TRANSACTION_COLUMNS = [
    ['TS', 6, 8, 0, 0],
    ['DEVICE', 5, 30, 1, 0],
    ['VAL', 20, 8, 2, 0],
];

const createBlock = (overrides: Record<string, any> = {}) => ({
    id: 'block-1',
    table: 'MACHBASEDB.SYS.ORDERS',
    customTable: false,
    customFullTyping: { use: false, text: '' },
    time: 'TS',
    type: 'transaction',
    userName: 'SYS',
    name: '',
    tag: '',
    value: 'VAL',
    aggregator: 'avg',
    alias: '',
    diff: 'none',
    useCustom: true,
    filter: [{ id: 'filter-1', column: '', operator: '', value: '', useFilter: false, useTyping: false, typingValue: '' }],
    values: [{ id: 'value-1', alias: '', value: 'VAL', jsonKey: '', aggregator: 'avg' }],
    color: '#000000',
    tableInfo: TRANSACTION_COLUMNS,
    math: '',
    isValidMath: true,
    duration: { from: '', to: '' },
    isVisible: true,
    ...overrides,
});

const time = { interval: { IntervalType: 'hour', IntervalValue: 1 }, start: 1788278400000, end: 1788292800000 };

const sqlFrom = (parser: typeof DashboardQueryParser, block: Record<string, any>) => {
    const [queries] = parser('line', 'TIME_VALUE' as any, [block], [], {}, [], time as any);
    return queries[0].sql as string;
};

describe('transaction (TYPE 8) block SQL', () => {
    test('buckets on the block time column and reads the value column', () => {
        const sql = sqlFrom(DashboardQueryParser, createBlock());

        expect(sql).toContain("DATE_BIN('hour', 1, TS)");
        expect(sql).toContain('from MACHBASEDB.SYS.ORDERS');
        expect(sql).toContain('TS BETWEEN 1788278400000000000 AND 1788292800000000000');
    });

    // Both would be rejected by the engine. DURATION is gated on `type === 'log'` and rollup on a
    // match that a transaction table can never have, so this is a regression guard rather than a fix.
    test('never emits DURATION or ROLLUP', () => {
        const sql = sqlFrom(DashboardQueryParser, createBlock({ duration: { from: '-1h', to: '1h' } }));

        expect(sql).not.toContain('DURATION');
        expect(sql).not.toContain('ROLLUP(');
    });

    test('a varchar filter is quoted and a numeric one is not', () => {
        const withFilter = (column: string, value: string) =>
            createBlock({ filter: [{ id: 'filter-1', column, operator: '=', value, useFilter: true, useTyping: false, typingValue: '' }] });

        expect(sqlFrom(DashboardQueryParser, withFilter('DEVICE', 'dev-a'))).toContain("DEVICE = 'dev-a'");
        expect(sqlFrom(DashboardQueryParser, withFilter('VAL', '1.5'))).toContain('VAL = 1.5');
    });

    /**
     * A board saved before transaction tables were supported can hold `useCustom: false`, and the
     * collapsed path builds its filter from the block's `name` — which for these types is `''`,
     * producing `AND  in ('dev-a')`. The expand-only guard makes the collapsed filter empty instead.
     */
    test('a collapsed saved block does not emit a filter on an empty column', () => {
        const sql = sqlFrom(DashboardQueryParser, createBlock({ useCustom: false, name: '', tag: 'dev-a' }));

        expect(sql).not.toContain('AND  in');
        expect(sql).not.toMatch(/\s{2}(in|=)\s/);
    });
});

describe('view (TYPE 7) block SQL', () => {
    const viewBlock = (overrides: Record<string, any> = {}) =>
        createBlock({
            type: 'view',
            table: 'FACTORY_A.SYS.DEMO_VIEW',
            tableInfo: [
                ['DEVICE', 5, 30, 0, 0],
                ['MSG', 5, 100, 1, 0],
                ['TS', 6, 8, 2, 0],
            ],
            ...overrides,
        });

    test('reads the view without DURATION or ROLLUP', () => {
        const sql = sqlFrom(DashboardQueryParser, viewBlock());

        expect(sql).toContain('from FACTORY_A.SYS.DEMO_VIEW');
        expect(sql).not.toContain('DURATION');
        expect(sql).not.toContain('ROLLUP(');
    });

    test('a collapsed saved block does not emit a tag filter either', () => {
        const sql = sqlFrom(DashboardQueryParser, viewBlock({ useCustom: false, name: '', tag: 'dev-a' }));

        expect(sql).not.toContain('AND  in');
    });
});

/**
 * The editor and the public board must agree. They are separate implementations, and the filter
 * quoting and the collapsed-block branches had drifted apart: the mirror quoted every filter value,
 * so a numeric filter that worked in the editor answered `MACHCLI-ERR-2032` on a shared link.
 */
describe('editor and public dashboard agree', () => {
    test.each([
        ['expanded transaction', createBlock()],
        ['collapsed transaction', createBlock({ useCustom: false, name: '', tag: 'dev-a' })],
        ['varchar filter', createBlock({ filter: [{ id: 'f', column: 'DEVICE', operator: '=', value: 'dev-a', useFilter: true, useTyping: false, typingValue: '' }] })],
        ['numeric filter', createBlock({ filter: [{ id: 'f', column: 'VAL', operator: 'in', value: '1.5', useFilter: true, useTyping: false, typingValue: '' }] })],
        ['expanded view', createBlock({ type: 'view', table: 'FACTORY_A.SYS.DEMO_VIEW' })],
    ])('%s produces identical SQL in both trees', (_label, block) => {
        expect(sqlFrom(PublicDashboardQueryParser, block)).toBe(sqlFrom(DashboardQueryParser, block));
    });
});
