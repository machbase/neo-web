import { getPanelTimeMinMaxTarget, hasResolvedTimeRange } from './dashboardTimeMinMax';

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
