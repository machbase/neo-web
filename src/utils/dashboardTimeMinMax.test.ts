import {
    createTableScanTimeMinMaxQuery,
    getPanelTimeMinMaxTarget,
    hasResolvedTimeRange,
    isTableScanTimeMinMaxTarget,
    pickBoardTimeMinMaxPanel,
    shouldFetchBlockTimeMinMax,
} from './dashboardTimeMinMax';

const timePanel = (id: string) => ({ id, type: 'Line', blockList: [{ timeBaseTime: true, timeType: 6 }] });
const distancePanel = (id: string) => ({ id, type: 'Line', blockList: [{ timeBaseTime: true, timeType: 20 }] });
const tqlPanel = (id: string) => ({ id, type: 'Tql chart', blockList: [] });
const emptyPanel = (id: string) => ({ id, type: 'Line', blockList: [] });

describe('pickBoardTimeMinMaxPanel', () => {
    test('distance-first mixed board picks the TIME panel (the bug fix)', () => {
        const panels = [distancePanel('d'), timePanel('t')];
        expect(pickBoardTimeMinMaxPanel(panels)).toBe(panels[1]);
    });

    test('time-first mixed board picks the first time panel', () => {
        const panels = [timePanel('t'), distancePanel('d')];
        expect(pickBoardTimeMinMaxPanel(panels)).toBe(panels[0]);
    });

    test('pure-time board picks the first panel', () => {
        const panels = [timePanel('t1'), timePanel('t2')];
        expect(pickBoardTimeMinMaxPanel(panels)).toBe(panels[0]);
    });

    test('pure-distance board falls back to the first (distance) panel', () => {
        const panels = [distancePanel('d1'), distancePanel('d2')];
        expect(pickBoardTimeMinMaxPanel(panels)).toBe(panels[0]);
    });

    test('skips Tql and blockList-less panels', () => {
        const panels = [tqlPanel('q'), emptyPanel('e'), distancePanel('d'), timePanel('t')];
        expect(pickBoardTimeMinMaxPanel(panels)).toBe(panels[3]);
    });

    test('returns undefined for tql-only / empty boards', () => {
        expect(pickBoardTimeMinMaxPanel([tqlPanel('q')])).toBeUndefined();
        expect(pickBoardTimeMinMaxPanel([])).toBeUndefined();
        expect(pickBoardTimeMinMaxPanel(undefined as any)).toBeUndefined();
    });
});

describe('dashboard time min max helpers', () => {
    test('treats zero as a valid resolved time value', () => {
        expect(hasResolvedTimeRange(0, 20.7)).toBe(true);
    });

    test('rejects missing resolved time values', () => {
        expect(hasResolvedTimeRange(undefined, 20.7)).toBe(false);
        expect(hasResolvedTimeRange(0, Number.NaN)).toBe(false);
    });

    test('prefers the currently edited panel as min max target', () => {
        const currentPanel = {
            id: 'edited',
            blockList: [{ table: 'NEW_VIEW' }],
        };
        const fallbackPanels = [
            { id: 'old-first', blockList: [{ table: 'OLD_TAG' }] },
            { id: 'edited', blockList: [{ table: 'OLD_VIEW' }] },
        ];

        expect(getPanelTimeMinMaxTarget(currentPanel, fallbackPanels, 'edited')).toBe(currentPanel);
    });

    test('falls back to the saved edited panel before the first dashboard panel', () => {
        const fallbackPanels = [
            { id: 'old-first', blockList: [{ table: 'OLD_TAG' }] },
            { id: 'edited', blockList: [{ table: 'SAVED_EDITED' }] },
        ];

        expect(getPanelTimeMinMaxTarget(undefined, fallbackPanels, 'edited')).toBe(fallbackPanels[1]);
    });
});

describe('table-scan time extent (view and transaction)', () => {
    const block = (over: Record<string, any> = {}) => ({ type: 'view', time: 'TS', table: 'FACTORY_A.SYS.DEMO_VIEW', userName: 'SYS', tag: '', useCustom: true, ...over });

    // Neither type has a V$<TABLE>_STAT to read an extent from, so both scan their own time column.
    test('both expand-only types are scan targets', () => {
        expect(isTableScanTimeMinMaxTarget(block())).toBe(true);
        expect(isTableScanTimeMinMaxTarget(block({ type: 'transaction', table: 'MACHBASEDB.SYS.ORDERS' }))).toBe(true);
    });

    test('tag and log are not — they keep their own paths', () => {
        expect(isTableScanTimeMinMaxTarget(block({ type: 'tag', time: 'TIME' }))).toBe(false);
        expect(isTableScanTimeMinMaxTarget(block({ type: 'log', time: '_ARRIVAL_TIME' }))).toBe(false);
    });

    // A view over a distance-based tag table loses the BASETIME flag and so resolves no time
    // column at all. Answering false here is what keeps `select min(), max()` from being built;
    // the panel falls back to the board range instead. Distance support for views is a known gap.
    test('a block with no resolved time column is not a scan target', () => {
        expect(isTableScanTimeMinMaxTarget(block({ time: '' }))).toBe(false);
        expect(isTableScanTimeMinMaxTarget(block({ time: undefined }))).toBe(false);
        expect(createTableScanTimeMinMaxQuery(block({ time: '' }))).toBeUndefined();
    });

    test('a transaction block asks for its extent without needing a tag', () => {
        expect(shouldFetchBlockTimeMinMax(block({ type: 'transaction', tag: '' }))).toBe(true);
    });

    test('the query scans the block time column on the qualified table', () => {
        expect(createTableScanTimeMinMaxQuery(block({ type: 'transaction', time: 'TS', table: 'MACHBASEDB.SYS.ORDERS' }))).toBe(
            'select min(TS) as min_time, max(TS) as max_time from MACHBASEDB.SYS.ORDERS'
        );
    });

    test('an unqualified table name is prefixed with the block owner', () => {
        expect(createTableScanTimeMinMaxQuery(block({ type: 'transaction', table: 'ORDERS', userName: 'SYS' }))).toBe(
            'select min(TS) as min_time, max(TS) as max_time from SYS.ORDERS'
        );
    });
});
