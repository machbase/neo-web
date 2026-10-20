import { bareTableName, isNeoInternalTable } from './internalTable';

/**
 * The seven names measured on a v8.7 catalogue. Every one is TYPE 8 / FLAG 0, which is why the
 * name is the only thing that can identify them.
 */
const NEO_TABLES = ['_NEO_API_TOKEN', '_NEO_BRIDGE_DEF', '_NEO_SHELL_DEF', '_NEO_STATZ', '_NEO_SUBSCRIBER_DEF', '_NEO_TIMER_DEF', '_NEO_X509_CERT'];

describe('bareTableName', () => {
    test('takes the last segment of a qualified name', () => {
        expect(bareTableName('MACHBASEDB.SYS._NEO_TIMER_DEF')).toBe('_NEO_TIMER_DEF');
        expect(bareTableName('KEV.KEV_TAG')).toBe('KEV_TAG');
    });

    test('leaves a bare name alone, and survives nothing at all', () => {
        expect(bareTableName('DEMO_TAG')).toBe('DEMO_TAG');
        expect(bareTableName(null)).toBe('');
        expect(bareTableName(undefined)).toBe('');
    });
});

describe('isNeoInternalTable', () => {
    test('every measured _NEO_ table is internal', () => {
        NEO_TABLES.forEach((aName) => expect(isNeoInternalTable(aName)).toBe(true));
    });

    // The dashboard exempts _NEO_STATZ so a panel can chart it. That exemption belongs to
    // dashboardTableKind, not here — the tree and the backup picker hide the whole family.
    test('_NEO_STATZ is internal here, exceptions being the caller’s business', () => {
        expect(isNeoInternalTable('_NEO_STATZ')).toBe(true);
    });

    test('judges a qualified name on its last segment', () => {
        expect(isNeoInternalTable('MACHBASEDB.SYS._NEO_TIMER_DEF')).toBe(true);
        expect(isNeoInternalTable('MACHBASEDB.SYS.DEMO_TAG')).toBe(false);
    });

    test('is case-insensitive, as table names are', () => {
        expect(isNeoInternalTable('_neo_timer_def')).toBe(true);
        expect(isNeoInternalTable('_Neo_Statz')).toBe(true);
    });

    // Anchored to `_NEO_`, not to `_`: a user may legally create `_ZZC`-style objects, and
    // `NEO_...` without the leading underscore is an ordinary name.
    test('leaves user tables alone', () => {
        expect(isNeoInternalTable('_MYTABLE')).toBe(false);
        expect(isNeoInternalTable('NEO_X')).toBe(false);
        expect(isNeoInternalTable('DEMO_TAG')).toBe(false);
        expect(isNeoInternalTable('')).toBe(false);
        expect(isNeoInternalTable(null)).toBe(false);
    });

    // The prefix is the rule, so a longer name in the family is internal too.
    test('a longer name in the family is still internal', () => {
        expect(isNeoInternalTable('_NEO_STATZ_DEF')).toBe(true);
    });
});
