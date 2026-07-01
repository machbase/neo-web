import { resolvePanelRangeInput } from './PanelRangeInput';

const FULL_RANGE = { startTime: 1_000, endTime: 100_000 };

describe('resolvePanelRangeInput - numeric axis', () => {
    it('resolves plain numeric values without clamping', () => {
        expect(
            resolvePanelRangeInput({ start: '10', end: '50' }, FULL_RANGE, true),
        ).toEqual({ startTime: 10, endTime: 50 });
    });

    it('resolves "first"/"last" data anchors against the full range', () => {
        expect(
            resolvePanelRangeInput(
                { start: 'first', end: 'last' },
                FULL_RANGE,
                true,
            ),
        ).toEqual(FULL_RANGE);
    });

    it('applies offsets ("first-10" = start + 10, "last-20" = end - 20)', () => {
        expect(
            resolvePanelRangeInput(
                { start: 'first-10', end: 'last-20' },
                FULL_RANGE,
                true,
            ),
        ).toEqual({ startTime: 1_010, endTime: 99_980 });
    });

    it('clamps a data-anchored window back inside the full range', () => {
        expect(
            resolvePanelRangeInput(
                { start: '-50', end: 'first-10' },
                FULL_RANGE,
                true,
            ),
        ).toEqual({ startTime: 1_000, endTime: 2_060 });
    });

    it('uses the full range start for an empty numeric start expression', () => {
        expect(
            resolvePanelRangeInput({ start: '', end: '2000' }, FULL_RANGE, true),
        ).toEqual({ startTime: 1_000, endTime: 2_000 });
    });

    it('uses the full range end for an empty numeric end expression', () => {
        expect(
            resolvePanelRangeInput({ start: '20', end: '' }, FULL_RANGE, true),
        ).toEqual({ startTime: 20, endTime: 100_000 });
    });


    it('returns undefined for fully empty input so the caller can apply defaults', () => {
        expect(
            resolvePanelRangeInput({ start: '', end: '' }, FULL_RANGE, true),
        ).toBeUndefined();
    });
    it('returns undefined for an inverted range', () => {
        expect(
            resolvePanelRangeInput({ start: '50', end: '10' }, FULL_RANGE, true),
        ).toBeUndefined();
    });
});

describe('resolvePanelRangeInput - datetime axis', () => {
    it('resolves "last"/"last-Ns" against the data end (full range end)', () => {
        expect(
            resolvePanelRangeInput(
                { start: 'last-1s', end: 'last' },
                FULL_RANGE,
                false,
            ),
        ).toEqual({ startTime: 99_000, endTime: 100_000 });
    });

    it('resolves an absolute datetime range', () => {
        expect(
            resolvePanelRangeInput(
                { start: '2024-01-01 00:00:00', end: '2024-01-02 00:00:00' },
                FULL_RANGE,
                false,
            ),
        ).toEqual({
            startTime: new Date(2024, 0, 1, 0, 0, 0).getTime(),
            endTime: new Date(2024, 0, 2, 0, 0, 0).getTime(),
        });
    });

    it('interprets the same "last-5" string differently per axis', () => {
        const numeric = resolvePanelRangeInput(
            { start: 'last-5', end: 'last' },
            FULL_RANGE,
            true,
        );
        const datetime = resolvePanelRangeInput(
            { start: 'last-5', end: 'last' },
            FULL_RANGE,
            false,
        );

        expect(numeric).toEqual({ startTime: 99_995, endTime: 100_000 });
        expect(datetime).toBeUndefined();
    });

    it('uses the full range start for an empty datetime start expression', () => {
        expect(
            resolvePanelRangeInput({ start: '', end: 'last' }, FULL_RANGE, false),
        ).toEqual(FULL_RANGE);
    });

    it('uses the full range end for an empty datetime end expression', () => {
        expect(
            resolvePanelRangeInput(
                { start: 'last-1s', end: '' },
                FULL_RANGE,
                false,
            ),
        ).toEqual({ startTime: 99_000, endTime: 100_000 });
    });

    it('returns undefined for an inverted now-relative range', () => {
        expect(
            resolvePanelRangeInput(
                { start: 'now', end: 'now-1h' },
                FULL_RANGE,
                false,
            ),
        ).toBeUndefined();
    });
});
