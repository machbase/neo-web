import { createTagAnalyzerBoardFromPayload } from './adapters';

// The Data Viewer hand-off, stated as the payload it actually sends. The two branches that meet
// here were developed apart — the Data Viewer learned a distance axis on one, the board learned a
// numeric range on the other — and this file is where their agreement is written down.
//
// `timeType` is the whole discriminator: BASETIME plus a non-DATETIME type means a numeric axis.
// 6 is DATETIME; anything else is a distance column.
const DATETIME_TYPE = 6;
const DISTANCE_TYPE = 12;

const buildTag = (timeType: number) => ({
    tagName: 'TAG_1',
    table: 'TAGDATA',
    calculationMode: 'avg',
    alias: '',
    colName: {
        name: 'NAME',
        time: timeType === DATETIME_TYPE ? 'TIME' : 'ODOMETER',
        value: 'VALUE',
        timeType,
        timeBaseTime: true,
        jsonKey: '',
    },
});

const expectOk = (result: ReturnType<typeof createTagAnalyzerBoardFromPayload>) => {
    if (result.status !== 'ok') throw new Error(`expected ok, got: ${result.reason}`);
    return result.board;
};

describe('createTagAnalyzerBoardFromPayload — time base', () => {
    test('an epoch window lands on the time axis and leaves the numeric axis blank', () => {
        const board = expectOk(
            createTagAnalyzerBoardFromPayload({
                title: 'Data Viewer',
                range: { startEpochMs: Date.parse('2026-06-01T00:00:00.000Z'), endEpochMs: Date.parse('2026-06-01T01:00:00.000Z') },
                tags: [buildTag(DATETIME_TYPE)],
            }),
        );

        expect(board.boardNumericRange).toEqual({ start: '', end: '' });
        expect(board.boardTimeRange.start).not.toBe('');
        expect(board.boardTimeRange.end).not.toBe('');
    });

    test('an ISO window survives as written', () => {
        const board = expectOk(
            createTagAnalyzerBoardFromPayload({
                range: { startIso: '2026-06-01T00:00:00.000Z', endIso: '2026-06-01T01:00:00.000Z' },
                tags: [buildTag(DATETIME_TYPE)],
            }),
        );

        expect(board.boardTimeRange).toEqual({ start: '2026-06-01T00:00:00.000Z', end: '2026-06-01T01:00:00.000Z' });
        expect(board.boardNumericRange).toEqual({ start: '', end: '' });
    });

    test('an omitted range still opens on the last hour', () => {
        const board = expectOk(createTagAnalyzerBoardFromPayload({ tags: [buildTag(DATETIME_TYPE)] }));

        expect(board.boardTimeRange).toEqual({ start: 'now-1h', end: 'now' });
    });
});

describe('createTagAnalyzerBoardFromPayload — distance base', () => {
    test('a numeric window lands on the numeric axis and leaves the time axis blank', () => {
        const board = expectOk(
            createTagAnalyzerBoardFromPayload({
                title: 'Data Viewer',
                range: { startValue: 0, endValue: 1000 },
                tags: [buildTag(DISTANCE_TYPE)],
            }),
        );

        expect(board.boardNumericRange).toEqual({ start: '0', end: '1000' });
        expect(board.boardTimeRange).toEqual({ start: '', end: '' });
        // Not a date, at any point along the way. This is the assertion the old adapter failed.
        expect(board.range_bgn).toBe('0');
        expect(board.range_end).toBe('1000');
    });

    test('a fractional window keeps its precision instead of being rounded to a timestamp', () => {
        const board = expectOk(
            createTagAnalyzerBoardFromPayload({
                range: { startValue: 12.5, endValue: 99.25 },
                tags: [buildTag(DISTANCE_TYPE)],
            }),
        );

        expect(board.boardNumericRange).toEqual({ start: '12.5', end: '99.25' });
    });

    test('an omitted range opens blank rather than inventing a numeric default', () => {
        // `now-1h` has no distance analogue, and 0 ~ 1 would be a claim about data nobody made.
        const board = expectOk(createTagAnalyzerBoardFromPayload({ tags: [buildTag(DISTANCE_TYPE)] }));

        expect(board.boardNumericRange).toEqual({ start: '', end: '' });
        expect(board.boardTimeRange).toEqual({ start: '', end: '' });
    });
});

describe('createTagAnalyzerBoardFromPayload — axis and range must agree', () => {
    // The regression that motivated all of this. `0 ~ 1000` is a run of finite numbers on either
    // axis, so it passes every check each side can make alone; only holding the range and the
    // columns together can catch it. Before this, it opened a distance board showing the first
    // second of 1970 and said nothing.
    test('a distance base with a time window is refused, not silently dated', () => {
        const result = createTagAnalyzerBoardFromPayload({
            range: { startEpochMs: 0, endEpochMs: 1000 },
            tags: [buildTag(DISTANCE_TYPE)],
        });

        expect(result.status).toBe('error');
        if (result.status === 'error') expect(result.reason).toMatch(/numeric/i);
    });

    test('a time base with a numeric window is refused', () => {
        const result = createTagAnalyzerBoardFromPayload({
            range: { startValue: 0, endValue: 1000 },
            tags: [buildTag(DATETIME_TYPE)],
        });

        expect(result.status).toBe('error');
        if (result.status === 'error') expect(result.reason).toMatch(/time range/i);
    });

    test('a payload mixing both axes is refused at the door', () => {
        const result = createTagAnalyzerBoardFromPayload({
            range: { startValue: 0, endValue: 1000 },
            tags: [buildTag(DISTANCE_TYPE), buildTag(DATETIME_TYPE)],
        });

        expect(result.status).toBe('error');
    });

    test('a reversed or empty numeric window is refused', () => {
        expect(
            createTagAnalyzerBoardFromPayload({ range: { startValue: 1000, endValue: 0 }, tags: [buildTag(DISTANCE_TYPE)] }).status,
        ).toBe('error');
        expect(
            createTagAnalyzerBoardFromPayload({ range: { startValue: 5, endValue: 5 }, tags: [buildTag(DISTANCE_TYPE)] }).status,
        ).toBe('error');
        expect(
            createTagAnalyzerBoardFromPayload({ range: { startValue: 'abc', endValue: 10 }, tags: [buildTag(DISTANCE_TYPE)] }).status,
        ).toBe('error');
    });
});
