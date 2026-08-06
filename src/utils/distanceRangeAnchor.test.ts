import {
    buildDistanceQuickWindowExpression,
    formatDistanceAxisLabel,
    formatDistanceEdgeLabel,
    formatDistanceSiShort,
    isDistanceAnchorEdge,
    isDistanceEdgeSet,
    parseDistanceAnchor,
    resolveDistanceEdge,
    thinDistanceTicks,
} from './distanceRange';

/**
 * A distance window can be pinned to the data rather than to coordinates — `last-5000 ~ last` is the
 * distance answer to `last-1h ~ last`, and follows new rows instead of freezing where they happened
 * to end when the window was chosen.
 */
const BOUNDS = { min: 1000, max: 138000 };

describe('anchored distance edges', () => {
    test.each([
        ['last', { anchor: 'last', offset: 0 }],
        ['last-5000', { anchor: 'last', offset: -5000 }],
        ['first', { anchor: 'first', offset: 0 }],
        ['first+5000', { anchor: 'first', offset: 5000 }],
        ['LAST - 250.5', { anchor: 'last', offset: -250.5 }],
        ['last-1e3', { anchor: 'last', offset: -1000 }],
    ])('parses %s', (aInput, aExpected) => {
        expect(parseDistanceAnchor(aInput)).toEqual(aExpected);
    });

    test.each([['5000'], [5000], [''], ['now-1h'], ['lastly'], ['last-'], ['last-abc'], [null], [undefined]])('%s is not an anchor', (aInput) => {
        expect(parseDistanceAnchor(aInput as any)).toBeNull();
        expect(isDistanceAnchorEdge(aInput as any)).toBe(false);
    });

    test('resolves against the data extent', () => {
        expect(resolveDistanceEdge('last', BOUNDS)).toBe(138000);
        expect(resolveDistanceEdge('last-5000', BOUNDS)).toBe(133000);
        expect(resolveDistanceEdge('first', BOUNDS)).toBe(1000);
        expect(resolveDistanceEdge('first+5000', BOUNDS)).toBe(6000);
    });

    test('the window follows the data as the extent grows', () => {
        expect(resolveDistanceEdge('last-5000', { min: 0, max: 138000 })).toBe(133000);
        expect(resolveDistanceEdge('last-5000', { min: 0, max: 142000 })).toBe(137000);
    });

    test('an offset larger than the extent lands on the bound, not before the data', () => {
        expect(resolveDistanceEdge('last-999999', BOUNDS)).toBe(BOUNDS.min);
        expect(resolveDistanceEdge('first+999999', BOUNDS)).toBe(BOUNDS.max);
    });

    test('a coordinate passes through untouched, with or without an extent', () => {
        expect(resolveDistanceEdge(4200, BOUNDS)).toBe(4200);
        expect(resolveDistanceEdge('4200', null)).toBe(4200);
    });

    test('an anchor without an extent cannot be resolved, and says so', () => {
        expect(resolveDistanceEdge('last-5000', null)).toBeNull();
        expect(resolveDistanceEdge('last-5000', { min: 0, max: 0 })).toBeNull();
    });

    test('unset edges are distinguishable from a coordinate of 0', () => {
        expect(isDistanceEdgeSet('')).toBe(false);
        expect(isDistanceEdgeSet(null)).toBe(false);
        expect(isDistanceEdgeSet(0)).toBe(true);
    });

    test('labels keep the expression, and group plain numbers', () => {
        expect(formatDistanceEdgeLabel('last-5000')).toBe('last-5000');
        expect(formatDistanceEdgeLabel('LAST - 5000')).toBe('last-5000');
        expect(formatDistanceEdgeLabel(138000)).toBe('138,000');
    });
});

describe('quick windows write anchors', () => {
    test('Last 25% is the most recent quarter, as an expression', () => {
        expect(buildDistanceQuickWindowExpression({ min: 0, max: 100000, edge: 'last', ratio: 0.25 })).toEqual({ from: 'last-25000', to: 'last' });
    });

    test('First 10% is the opening tenth, anchored to the start', () => {
        expect(buildDistanceQuickWindowExpression({ min: 0, max: 100000, edge: 'first', ratio: 0.1 })).toEqual({ from: 'first', to: 'first+10000' });
    });

    test('Full is both anchors — the whole extent, however much of it there comes to be', () => {
        expect(buildDistanceQuickWindowExpression({ min: 0, max: 100000, edge: 'first', ratio: 1 })).toEqual({ from: 'first', to: 'last' });
    });

    test('what they write resolves back to the window they promised', () => {
        const sWindow = buildDistanceQuickWindowExpression({ min: 1000, max: 138000, edge: 'last', ratio: 0.25 })!;
        expect(resolveDistanceEdge(sWindow.from, BOUNDS)).toBe(103750);
        expect(resolveDistanceEdge(sWindow.to, BOUNDS)).toBe(138000);
    });

    test('no extent means no fraction to take', () => {
        expect(buildDistanceQuickWindowExpression({ min: 0, max: 0, edge: 'last', ratio: 0.5 })).toBeNull();
    });
});

describe('SI short, for the header chip', () => {
    test.each([
        [0, '0'],
        [325, '325'],
        [4990, '4.99 K'],
        [138000, '138 K'],
        [25150651, '25.151 M'],
        [2500000000, '2.5 G'],
        [-4990, '-4.99 K'],
    ])('%s reads as %s', (aInput, aExpected) => {
        expect(formatDistanceSiShort(aInput)).toBe(aExpected);
    });

    test('three decimals, so a kilometre-scale window still reads as a window', () => {
        expect(formatDistanceSiShort(25150000)).toBe('25.15 M');
        expect(formatDistanceSiShort(25153000)).toBe('25.153 M');
    });

    test('edges closer than the scale can express collapse — which is why the chip also carries the exact pair', () => {
        // 325 units apart at 25 M: SI short cannot separate them, so RangeChips puts the full numbers
        // in the chip's title rather than pretending the short form is lossless.
        expect(formatDistanceSiShort(25150651)).toBe(formatDistanceSiShort(25150976));
    });

    test('a value that is not a number says so rather than printing NaN', () => {
        expect(formatDistanceSiShort('')).toBe('-');
        expect(formatDistanceSiShort('last-5000')).toBe('-');
    });
});

describe('axis labels are sized to the tick step', () => {
    test('a coarse step needs no decimals', () => {
        expect(formatDistanceAxisLabel(200000, 200000)).toBe('200K');
        expect(formatDistanceAxisLabel(0, 200000)).toBe('0');
    });

    test('a step far finer than the magnitude gets the decimals it needs to stay distinct', () => {
        // ~885 units of extent around 25,150,000: one decimal would print every tick as `25.1M`.
        const sStep = 200;
        expect(formatDistanceAxisLabel(25150400, sStep)).not.toBe(formatDistanceAxisLabel(25150800, sStep));
    });

    test('and never runs past six decimals', () => {
        expect(formatDistanceAxisLabel(25150400, 0.000001).split('.')[1]?.replace('M', '').length ?? 0).toBeLessThanOrEqual(6);
    });
});

describe('ticks thin out as their labels grow', () => {
    const sTicks = [0, 1, 2, 3, 4, 5];

    test('short labels are all drawn', () => {
        expect(thinDistanceTicks(sTicks, (aTick) => `${aTick}K`)).toEqual(sTicks);
    });

    test('long labels are drawn every other one', () => {
        expect(thinDistanceTicks(sTicks, (aTick) => `25.150${aTick}M`)).toEqual([0, 2, 4]);
    });

    test('very long labels — past twice the budget — every third', () => {
        // Past twice the six-character budget (13 chars here) the rail can hold two labels, not three.
        expect(thinDistanceTicks(sTicks, (aTick) => `${'2'.repeat(12)}${aTick}`)).toEqual([0, 3]);
    });
});
