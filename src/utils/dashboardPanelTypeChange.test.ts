import { buildPanelOptionForType } from './dashboardPanelTypeChange';
import { DefaultChartOption, DefaultCommonOption, DefaultTagTableOption, getDefaultSeriesOption } from './eChartHelper';

/**
 * A panel as CreatePanel seeds it for a brand-new chart: DefaultChartOption plus a block.
 *
 * `aFreeze` reproduces what Recoil does to a panel that has been saved to the board — it deep-freezes
 * state in dev — which is the state the type change used to crash on.
 */
const seedBlock = () => ({ ...structuredClone(DefaultTagTableOption), id: 'b1', table: 'SYS.DEMO_TAG', type: 'tag', tag: 't1' });

const seedPanel = () => {
    const sPanel: any = structuredClone(DefaultChartOption);
    sPanel.id = 'p1';
    sPanel.blockList = [seedBlock()];
    sPanel.chartOptions = structuredClone(getDefaultSeriesOption('line'));
    return sPanel;
};

const deepFreeze = (aValue: any) => {
    if (aValue && typeof aValue === 'object' && !Object.isFrozen(aValue)) {
        Object.freeze(aValue);
        Object.getOwnPropertyNames(aValue).forEach((aKey) => deepFreeze(aValue[aKey]));
    }
    return aValue;
};

describe('a chart type change never writes through to the shared defaults', () => {
    /**
     * The crash, end to end. CreatePanel used to seed a new panel with a shallow spread of
     * DefaultChartOption, so the panel's `commonOptions` WAS the module singleton; saving that panel
     * put the singleton into Recoil, which deep-freezes state in dev, and the next Adv scatter threw
     * `Cannot assign to read only property 'tooltipTrigger'`.
     *
     * Freezing the real singleton is a one-way door, so this runs against a private copy of the module
     * registry — otherwise every later test in this file would inherit the frozen defaults.
     */
    test('a saved panel that carried the shared defaults into Recoil does not break the next type change', () => {
        jest.isolateModules(() => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const sIsolated = require('./dashboardPanelTypeChange');
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const sHelper = require('./eChartHelper');
            const sSaved = { ...sHelper.DefaultChartOption, id: 'p1', blockList: [{ ...sHelper.DefaultTagTableOption, id: 'b1', table: 'SYS.DEMO_TAG', type: 'tag', tag: 't1' }] };
            deepFreeze(sSaved);
            expect(() => sIsolated.buildPanelOptionForType(sSaved, 'Adv scatter', 'create')).not.toThrow();
        });
    });

    // Adv scatter is the only type that sets a common option of its own, so it was the only one that
    // wrote to whatever object `commonOptions` happened to point at.
    test('Adv scatter leaves DefaultCommonOption.tooltipTrigger alone', () => {
        buildPanelOptionForType(seedPanel(), 'Adv scatter', 'create');
        expect(DefaultCommonOption.tooltipTrigger).toBe('axis');
        expect(DefaultChartOption.commonOptions.tooltipTrigger).toBe('axis');
    });

    // The leak was only visible one panel later: the next chart created in the same session inherited
    // the mutated default, so a plain Line panel came up with an Adv scatter's tooltip trigger.
    test('a Line panel created after an Adv scatter still gets the axis trigger', () => {
        buildPanelOptionForType(seedPanel(), 'Adv scatter', 'create');
        const sNext = buildPanelOptionForType(seedPanel(), 'Line', 'create');
        expect(sNext.commonOptions.tooltipTrigger).toBe('axis');
    });

    test('Adv scatter still gets its own item trigger', () => {
        const sPanel = buildPanelOptionForType(seedPanel(), 'Adv scatter', 'create');
        expect(sPanel.commonOptions.tooltipTrigger).toBe('item');
    });

    test('Pie still gets its own legend placement', () => {
        const sPanel = buildPanelOptionForType(seedPanel(), 'Pie', 'create');
        expect(sPanel.commonOptions.legendTop).toBe('top');
        expect(sPanel.commonOptions.legendLeft).toBe('right');
        expect(sPanel.commonOptions.legendOrient).toBe('vertical');
    });

    test('the new commonOptions is a fresh object, not the shared singleton', () => {
        const sPanel = buildPanelOptionForType(seedPanel(), 'Bar', 'create');
        expect(sPanel.commonOptions).not.toBe(DefaultCommonOption);
        expect(sPanel.commonOptions).toEqual(DefaultCommonOption);
    });

    // Editing an existing panel keeps whatever the user configured; only a brand-new panel is reset.
    test('edit mode leaves commonOptions untouched', () => {
        const sPanel = seedPanel();
        sPanel.commonOptions = { ...DefaultCommonOption, tooltipTrigger: 'none', isLegend: false };
        const sNext = buildPanelOptionForType(sPanel, 'Adv scatter', 'edit');
        expect(sNext.commonOptions.tooltipTrigger).toBe('none');
        expect(sNext.commonOptions.isLegend).toBe(false);
    });
});
