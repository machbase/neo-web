import { getGridPanels, toGridLayout, toGridPosition } from './dashboardGridPosition';

describe('dashboardGridPosition', () => {
    it('passes numeric coordinates through and reads numeric strings as numbers', () => {
        expect(toGridPosition({ x: 3, y: 4, w: 5, h: 6 })).toEqual({ x: 3, y: 4, w: 5, h: 6 });
        expect(toGridPosition({ x: '3', y: '4', w: '5', h: '6' })).toEqual({ x: 3, y: 4, w: 5, h: 6 });
    });

    it("falls back to a new panel's position for anything that is not a number", () => {
        expect(toGridPosition({ x: 'a', y: null, w: {}, h: [] })).toEqual({ x: 0, y: 0, w: 7, h: 7 });
        expect(toGridPosition({})).toEqual({ x: 0, y: 0, w: 7, h: 7 });
    });

    it('leaves the panels themselves untouched', () => {
        const sPanel = { id: 'p', x: 'a', w: 5 };
        expect(toGridLayout([sPanel])).toEqual([{ id: 'p', x: 0, y: 0, w: 5, h: 7 }]);
        expect(sPanel).toEqual({ id: 'p', x: 'a', w: 5 });
    });

    it('places only object entries', () => {
        expect(getGridPanels([{ id: 'a' }, null, 'x', [], { id: 'b' }]).map((aPanel) => aPanel.id)).toEqual(['a', 'b']);
        expect(getGridPanels(undefined)).toEqual([]);
    });
});
