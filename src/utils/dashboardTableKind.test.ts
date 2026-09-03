import {
    isDashboardSelectableTable,
    isDashboardTableType,
    isCollapsibleTableType,
    isTaglessTableType,
    isHiddenColumnForTableType,
    isInternalDashboardTable,
    visibleColumnsForTableType,
} from './dashboardTableKind';

describe('isDashboardTableType', () => {
    test('the four types a panel can read', () => {
        expect(['tag', 'log', 'view', 'transaction'].map(isDashboardTableType)).toEqual([true, true, true, true]);
    });

    // Everything getTableType can answer that a panel cannot chart. `kv` is spelled that way by
    // getTableType and `keyValue` by the explorer's converter — neither is selectable.
    test('the types it cannot', () => {
        expect(['fixed', 'volatile', 'lookup', 'kv', 'keyValue', 'exception', '', undefined, null].map(isDashboardTableType)).toEqual(
            [false, false, false, false, false, false, false, false, false]
        );
    });

    // getTableType only ever answers lower case, but a block type read back out of a saved .dsh has
    // been through hand editing before now.
    test('case and surrounding space do not change the answer', () => {
        expect(isDashboardTableType('TRANSACTION')).toBe(true);
        expect(isDashboardTableType(' View ')).toBe(true);
    });
});

describe('isTaglessTableType', () => {
    test('view and transaction have no tag column to collapse onto', () => {
        expect(isTaglessTableType('view')).toBe(true);
        expect(isTaglessTableType('transaction')).toBe(true);
    });

    // log opens expanded too, but for a different reason — and unlike these two its `name` resolves
    // to a real VARCHAR column, so a collapsed log block emits a working `DEVICE in ('dev-a')`.
    // Calling log tagless would drop that filter from boards that already have one.
    test('tag and log are not tagless', () => {
        expect(isTaglessTableType('tag')).toBe(false);
        expect(isTaglessTableType('log')).toBe(false);
    });

    test('a block with no type at all is not', () => {
        expect(isTaglessTableType(undefined)).toBe(false);
    });
});

describe('isCollapsibleTableType', () => {
    test('tag folds, and so does a typed or variable table name', () => {
        expect(isCollapsibleTableType('tag')).toBe(true);
        // Block's own synthetic type for a name the user typed or a ${variable} — it normally
        // resolves to a tag table, and folding it worked before the v8.7 types existed.
        expect(isCollapsibleTableType('variable_tag')).toBe(true);
    });

    test('log, view, transaction and a stat-view block do not', () => {
        expect(['log', 'view', 'transaction', 'vir_tag'].map(isCollapsibleTableType)).toEqual([false, false, false, false]);
    });
});

describe('isInternalDashboardTable', () => {
    test("neo's own tables, all six of which are TYPE 8", () => {
        ['_NEO_API_TOKEN', '_NEO_BRIDGE_DEF', '_NEO_SHELL_DEF', '_NEO_SUBSCRIBER_DEF', '_NEO_TIMER_DEF', '_NEO_X509_CERT'].forEach((aName) =>
            expect(isInternalDashboardTable(aName)).toBe(true)
        );
    });

    // The engine accepts `_`-leading names from users — measured, `CREATE TABLE _ZZCHK (A integer)`
    // succeeds and reads back — so the rule is anchored to `_NEO_` and not to a bare underscore.
    test('a user table that merely starts with an underscore is left alone', () => {
        expect(isInternalDashboardTable('_ZZCHK')).toBe(false);
        expect(isInternalDashboardTable('_SENSOR_2026')).toBe(false);
    });

    test('a qualified name is judged on its object segment', () => {
        expect(isInternalDashboardTable('MACHBASEDB.SYS._NEO_TIMER_DEF')).toBe(true);
        expect(isInternalDashboardTable('MACHBASEDB.SYS.SENSOR')).toBe(false);
    });
});

describe('isDashboardSelectableTable', () => {
    test('a v8.7 transaction table belongs in the dropdown', () => {
        expect(isDashboardSelectableTable('transaction', 'ORDERS')).toBe(true);
    });

    test("neo's internal transaction tables do not", () => {
        expect(isDashboardSelectableTable('transaction', '_NEO_TIMER_DEF')).toBe(false);
    });

    test('a lookup table is still out, internal name or not', () => {
        expect(isDashboardSelectableTable('lookup', 'DEMO_LOOKUP')).toBe(false);
    });

    // A tag table's own partitions are TYPE 4/5, so the type check already excludes them and the
    // name rule never has to reason about `_DEMO_TAG_META`.
    test("a tag table's meta partition is excluded by type, not by name", () => {
        expect(isDashboardSelectableTable('lookup', '_DEMO_TAG_META')).toBe(false);
        expect(isDashboardSelectableTable('tag', 'DEMO_TAG')).toBe(true);
    });
});

describe('isHiddenColumnForTableType', () => {
    test('tag keeps hiding every underscore column', () => {
        expect(isHiddenColumnForTableType('tag', '_RID')).toBe(true);
        expect(isHiddenColumnForTableType('tag', 'NAME')).toBe(false);
    });

    // `_RID` is reported by M$SYS_COLUMNS for a view but cannot be selected from one — measured,
    // `select _RID from FACTORY_A.SYS.DEMO_VIEW` answers MACHCLI-ERR-2056.
    test('view hides only the phantom _RID', () => {
        expect(isHiddenColumnForTableType('view', '_RID')).toBe(true);
        expect(isHiddenColumnForTableType('view', '_rid')).toBe(true);
        expect(isHiddenColumnForTableType('view', '_ZZC')).toBe(false);
    });

    // On a log table `_RID` genuinely reads, and `_ARRIVAL_TIME` is the default time field — hiding
    // either would take away working behaviour.
    test('log hides nothing', () => {
        expect(isHiddenColumnForTableType('log', '_RID')).toBe(false);
        expect(isHiddenColumnForTableType('log', '_ARRIVAL_TIME')).toBe(false);
    });

    test('transaction hides nothing — it has no _RID to begin with', () => {
        expect(isHiddenColumnForTableType('transaction', '_RID')).toBe(false);
        expect(isHiddenColumnForTableType('transaction', 'TS')).toBe(false);
    });
});

describe('visibleColumnsForTableType', () => {
    const viewColumns = [
        ['DEVICE', 5, 30, 0, 0],
        ['MSG', 5, 100, 1, 0],
        ['TS', 6, 8, 2, 0],
        ['_RID', 12, 8, 65534, 0],
    ];

    // The failure this guards: `_RID` is a LONG, so it passes isNumberTypeColumn and becomes the
    // default Value field on a view whose other columns are all text or datetime — and then every
    // query the panel builds fails.
    test('a view built only of text and datetime columns has _RID removed', () => {
        expect(visibleColumnsForTableType('view', viewColumns).map((aColumn) => aColumn[0])).toEqual(['DEVICE', 'MSG', 'TS']);
    });

    test('the same columns on a log table are all kept', () => {
        expect(visibleColumnsForTableType('log', viewColumns)).toHaveLength(4);
    });

    test('no columns at all is not an error', () => {
        expect(visibleColumnsForTableType('view', [])).toEqual([]);
        expect(visibleColumnsForTableType('view')).toEqual([]);
    });
});
