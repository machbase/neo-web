import { getPanelTimeMinMaxTarget, hasResolvedTimeRange, pickBoardTimeMinMaxPanel } from './dashboardTimeMinMax';

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
