import { getPanelTimeMinMaxTarget, hasResolvedTimeRange, pickBoardTimeMinMaxPanel, pickBoardDistanceMinMaxPanel } from './dashboardTimeMinMax';

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
            type: 'Line',
            blockList: [{ table: 'NEW_VIEW' }],
        };
        const fallbackPanels = [
            { id: 'old-first', type: 'Line', blockList: [{ table: 'OLD_TAG' }] },
            { id: 'edited', type: 'Line', blockList: [{ table: 'OLD_VIEW' }] },
        ];

        expect(getPanelTimeMinMaxTarget(currentPanel, fallbackPanels, 'edited')).toBe(currentPanel);
    });

    test('falls back to the saved edited panel before the first dashboard panel', () => {
        const fallbackPanels = [
            { id: 'old-first', type: 'Line', blockList: [{ table: 'OLD_TAG' }] },
            { id: 'edited', type: 'Line', blockList: [{ table: 'SAVED_EDITED' }] },
        ];

        expect(getPanelTimeMinMaxTarget(undefined, fallbackPanels, 'edited')).toBe(fallbackPanels[1]);
    });
});

describe('unsupported panel query isolation', () => {
    const unavailable = (numeric = false) => ({
        id: 'unavailable', type: 'Unavailable panel',
        blockList: [{ table: 'RETAINED_DATA', tag: 'retained', timeBaseTime: true, timeType: numeric ? 20 : 6 }],
        opaque: { retained: ['settings'] },
    });

    test('keeps unsupported retained blocks out of board time selection and leaves all input data unchanged', () => {
        const panels = [unavailable(), distancePanel('numeric'), timePanel('first-time'), timePanel('second-time')];
        const saved = JSON.stringify(panels);
        expect(pickBoardTimeMinMaxPanel(panels)).toBe(panels[2]);
        expect(pickBoardTimeMinMaxPanel([panels[0]])).toBeUndefined();
        expect(JSON.stringify(panels)).toBe(saved);
    });

    test('keeps unsupported retained numeric blocks out of distance selection and keeps supported order', () => {
        const panels = [unavailable(true), timePanel('time'), distancePanel('first-distance'), distancePanel('second-distance')];
        const saved = JSON.stringify(panels);
        expect(pickBoardDistanceMinMaxPanel(panels)).toBe(panels[2]);
        expect(pickBoardDistanceMinMaxPanel([panels[0], panels[1]])).toBeUndefined();
        expect(JSON.stringify(panels)).toBe(saved);
    });

    test('does not use an unsupported current or saved edited panel as an editor query target', () => {
        const retired = unavailable(); const panels = [retired, timePanel('normal')]; const saved = JSON.stringify(panels);
        expect(getPanelTimeMinMaxTarget(retired, panels)).toBe(panels[1]);
        expect(getPanelTimeMinMaxTarget(retired, panels, retired.id)).toBeUndefined();
        expect(JSON.stringify(panels)).toBe(saved);
    });
});
