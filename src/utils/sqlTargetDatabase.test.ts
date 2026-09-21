import type { SqlStatementEnv } from './sqlFormatter';
import { applyTargetDatabase, isDatabaseNameSafe } from './sqlTargetDatabase';

/**
 * The splitter's `env`, not a local narrowing of it — the same reason `sqlFormatter.test.ts`
 * aliases it. This merge spreads whatever the splitter reported, so a copy that cannot name
 * `timeformat` cannot notice the day the spread stops carrying it.
 */
type TestEnv = SqlStatementEnv;

const stmt = (aOverrides: { env?: TestEnv; isComment?: boolean } = {}) => ({
    text: 'select 1',
    isComment: false,
    env: {} as TestEnv,
    ...aOverrides,
});

describe('applyTargetDatabase', () => {
    // REGRESSION: with no chip the statements must reach the formatter untouched, so the TQL stays
    // byte-identical to the pre-chip output that sqlFormatter.test.ts pins.
    test('no target returns the same array instance', () => {
        const sInput = [stmt(), stmt()];
        expect(applyTargetDatabase(sInput, null)).toBe(sInput);
    });

    test('empty target is ignored', () => {
        const sInput = [stmt()];
        expect(applyTargetDatabase(sInput, '')).toBe(sInput);
    });

    test('applies to statements with no directive', () => {
        const sResult = applyTargetDatabase([stmt(), stmt()], 'FACTORY_A');
        expect(sResult.map((aItem) => aItem.env.use)).toEqual(['FACTORY_A', 'FACTORY_A']);
    });

    test('an explicit `-- env: use=` wins', () => {
        const sResult = applyTargetDatabase([stmt({ env: { use: 'EDGE_GW01' } }), stmt()], 'FACTORY_A');
        expect(sResult.map((aItem) => aItem.env.use)).toEqual(['EDGE_GW01', 'FACTORY_A']);
    });

    test('a bridge statement is left alone', () => {
        const sInput = [stmt({ env: { bridge: 'my-bridge' } })];
        const sResult = applyTargetDatabase(sInput, 'FACTORY_A');
        expect(sResult[0].env.use).toBeUndefined();
        expect(sResult).toBe(sInput);
    });

    test('comments are left alone', () => {
        const sInput = [stmt({ isComment: true })];
        expect(applyTargetDatabase(sInput, 'FACTORY_A')).toBe(sInput);
    });

    test('other env fields survive the merge', () => {
        const sResult = applyTargetDatabase([stmt({ env: { named: { tag: 'x' } } })], 'FACTORY_A');
        expect(sResult[0].env).toEqual({ named: { tag: 'x' }, use: 'FACTORY_A' });
    });

    // REGRESSION (#1532): the merge rebuilds `env` with a spread, so every directive the splitter
    // reported has to come out the other side. `timeformat`, `tz` and `binaryformat` were added to
    // that type after this module was written, and a statement carrying them still has no `use` of
    // its own — so it is exactly the statement the chip applies to, and exactly the one a narrowed
    // spread would quietly strip on the way to the sink.
    test('the output directives survive the chip merge', () => {
        const sResult = applyTargetDatabase([stmt({ env: { timeformat: 'ns', tz: 'Asia/Seoul', binaryformat: 'hex' } })], 'FACTORY_A');
        expect(sResult[0].env).toEqual({ timeformat: 'ns', tz: 'Asia/Seoul', binaryformat: 'hex', use: 'FACTORY_A' });
    });

    test('a statement with output directives still receives the chip', () => {
        const sResult = applyTargetDatabase([stmt({ env: { timeformat: 'ns' } }), stmt({ env: { binaryformat: 'hex' } })], 'FACTORY_A');
        expect(sResult.map((aItem) => aItem.env.use)).toEqual(['FACTORY_A', 'FACTORY_A']);
    });

    // The three do not change who accepts the chip: a bridge statement is still left alone and an
    // explicit `-- env: use=` still wins, directives or no directives.
    test('output directives do not change which statements accept the chip', () => {
        const sBridge = [stmt({ env: { bridge: 'my-bridge', timeformat: 'ns' } })];
        expect(applyTargetDatabase(sBridge, 'FACTORY_A')).toBe(sBridge);
        const sExplicit = applyTargetDatabase([stmt({ env: { use: 'EDGE_GW01', tz: 'UTC' } })], 'FACTORY_A');
        expect(sExplicit[0].env).toEqual({ use: 'EDGE_GW01', tz: 'UTC' });
    });

    test('does not mutate the input statements', () => {
        const sInput = [stmt()];
        applyTargetDatabase(sInput, 'FACTORY_A');
        expect(sInput[0].env.use).toBeUndefined();
    });

    test('a value that is not an identifier is refused', () => {
        const sInput = [stmt()];
        expect(applyTargetDatabase(sInput, "A'); DROP")).toBe(sInput);
        expect(applyTargetDatabase(sInput, '1DB')).toBe(sInput);
    });

    test('a mixed list touches only the statements that accept the value', () => {
        const sResult = applyTargetDatabase(
            [stmt(), stmt({ env: { use: 'X' } }), stmt({ env: { bridge: 'b' } }), stmt({ isComment: true }), stmt()],
            'FACTORY_A'
        );
        expect(sResult.map((aItem) => aItem.env.use)).toEqual(['FACTORY_A', 'X', undefined, undefined, 'FACTORY_A']);
    });

    test('undefined statement list is tolerated', () => {
        expect(applyTargetDatabase(undefined, 'FACTORY_A')).toEqual([]);
    });
});

describe('isDatabaseNameSafe', () => {
    test.each([
        ['MACHBASEDB', true],
        ['FACTORY_A', true],
        ['_private', true],
        ['2020_ARCHIVE', false],
        ['a b', false],
        ["a'b", false],
        ['', false],
    ])('%s -> %s', (aName, aExpected) => {
        expect(isDatabaseNameSafe(aName)).toBe(aExpected);
    });
});
