import { resolvePanelMinSize } from './dashboardPanelMinSize';
import { GRID_LAYOUT_MIN_H, GRID_LAYOUT_MIN_W } from './constants';

describe('resolvePanelMinSize', () => {
    test('a panel at the default 7x7 gets the full floor on both axes', () => {
        expect(resolvePanelMinSize({ w: 7, h: 7 })).toEqual({ minW: GRID_LAYOUT_MIN_W, minH: GRID_LAYOUT_MIN_H });
    });

    test('a panel exactly at the floor gets the floor', () => {
        expect(resolvePanelMinSize({ w: GRID_LAYOUT_MIN_W, h: GRID_LAYOUT_MIN_H })).toEqual({ minW: GRID_LAYOUT_MIN_W, minH: GRID_LAYOUT_MIN_H });
    });

    // The case in issue #1509: a board saved with a panel squashed below the floor. The floor must
    // not exceed what is stored, or RGL logs `minWidth larger than item width` on every render and
    // the panel jumps the first time a handle is touched.
    test('a panel already smaller than the floor is pinned at its own size, not raised', () => {
        expect(resolvePanelMinSize({ w: 30, h: 2 })).toEqual({ minW: GRID_LAYOUT_MIN_W, minH: 2 });
        expect(resolvePanelMinSize({ w: 1, h: 1 })).toEqual({ minW: 1, minH: 1 });
    });

    // Growing past the floor is what re-arms it: `changeLayout` writes the new size back, and the
    // next render resolves the full floor, which the panel can no longer drop below.
    test('the floor ratchets back once the panel is grown past it', () => {
        expect(resolvePanelMinSize({ w: 30, h: 2 }).minH).toBe(2);
        expect(resolvePanelMinSize({ w: 30, h: 8 }).minH).toBe(GRID_LAYOUT_MIN_H);
    });

    // A `w`/`h` read back out of a hand-edited .dsh can be anything. NaN in particular would reach
    // RGL's `clamp(w, Math.max(minW, 1), maxW)` and size the panel to NaN.
    test('a size that is not a usable number falls back to the plain floor', () => {
        const sFloor = { minW: GRID_LAYOUT_MIN_W, minH: GRID_LAYOUT_MIN_H };
        expect(resolvePanelMinSize({ w: NaN, h: NaN })).toEqual(sFloor);
        expect(resolvePanelMinSize({ w: '5' as unknown, h: null })).toEqual(sFloor);
        expect(resolvePanelMinSize({ w: 0, h: -4 })).toEqual(sFloor);
        expect(resolvePanelMinSize({})).toEqual(sFloor);
        expect(resolvePanelMinSize(undefined)).toEqual(sFloor);
    });

    test('a fractional size floors rather than producing a fractional min', () => {
        expect(resolvePanelMinSize({ w: 2.7, h: 9.9 })).toEqual({ minW: 2, minH: GRID_LAYOUT_MIN_H });
    });
});
