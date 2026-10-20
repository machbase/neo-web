import { createSection, createWidget, SectionNode, WidgetSize } from './layoutModel';
import { besideSections, EMPTY_BODY, leastSavedHeight, NESTED_HEAD, packRows, ROW_GAP, shapeOf, widgetRowHeight } from './rowModel';

const widget = (aSize: WidgetSize) => createWidget('clock', aSize);
const section = (aChildren: SectionNode['children'], aSize: WidgetSize = 4, aHeight?: number): SectionNode => ({ ...createSection('', aChildren, aSize), ...(aHeight ? { height: aHeight } : {}) });

describe('packRows', () => {
    it('starts a row when the next child does not fit the four columns', () => {
        const sRows = packRows(section([widget(2), widget(1), widget(2), widget(4), widget(1)]));
        expect(sRows.map((aRow) => aRow.map((aNode) => aNode.size))).toEqual([[2, 1], [2], [4], [1]]);
    });
});

describe('shapeOf', () => {
    it('changes with order, nesting and size but not with height', () => {
        const sA = widget(1);
        const sB = widget(2);
        const sInner = section([sB], 2, 100);
        const sOuter = section([sA, sInner]);
        const sBase = shapeOf([sOuter]);
        expect(shapeOf([{ ...sOuter, children: [sA, { ...sInner, height: 300 }] }])).toBe(sBase);
        expect(shapeOf([{ ...sOuter, children: [sInner, sA] }])).not.toBe(sBase);
        expect(shapeOf([{ ...sOuter, children: [{ ...sA, size: 2 }, sInner] }])).not.toBe(sBase);
    });
});

// newtab-edit-autogrow: what a set-height section needs, worked out from the layout at any window width.
describe('leastSavedHeight', () => {
    it('gives each row of widgets the smallest widget height, plus the gaps', () => {
        expect(leastSavedHeight(section([widget(4), widget(2), widget(2)]))).toBe(80 + ROW_GAP + 80);
    });

    it('gives a row of nested sections their head and own height, or what they need', () => {
        const sFixed = section([widget(4)], 2, 150);
        const sAuto = section([widget(4), widget(4)], 2);
        expect(leastSavedHeight(section([sFixed, sAuto]))).toBe(Math.max(NESTED_HEAD + 150, NESTED_HEAD + 80 + ROW_GAP + 80));
    });

    it('takes the taller of a widget and a nested section sharing a row', () => {
        expect(leastSavedHeight(section([widget(2), section([widget(4)], 2, 40)]))).toBe(Math.max(80, NESTED_HEAD + 40));
    });

    it('gives an empty section its drop hint', () => {
        expect(leastSavedHeight(section([]))).toBe(EMPTY_BODY);
        expect(leastSavedHeight(section([section([], 4)]))).toBe(NESTED_HEAD + EMPTY_BODY);
    });
});

// newtab-view-narrow-heights: the four-column row height a widget keeps once the window is narrow.
describe('widgetRowHeight', () => {
    it('shares the height between rows of widgets', () => {
        expect(widgetRowHeight(section([widget(2), widget(2), widget(2), widget(2)]), 300)).toBe((300 - ROW_GAP) / 2);
    });

    it('leaves the rows of nested sections their own height', () => {
        const sNested = section([widget(4)], 4, 100);
        expect(widgetRowHeight(section([widget(4), sNested]), 400)).toBe(400 - ROW_GAP - (NESTED_HEAD + 100));
    });

    it('never goes below the smallest widget', () => {
        expect(widgetRowHeight(section([widget(4), widget(4), widget(4)]), 120)).toBe(80);
    });
});

describe('besideSections', () => {
    it('lists only widgets sharing a row with nested sections, with that row height', () => {
        const sAlone = widget(4);
        const sBeside = widget(2);
        const sMap = besideSections(section([sAlone, sBeside, section([widget(4)], 2, 150)]));
        expect([...sMap]).toEqual([[sBeside.id, NESTED_HEAD + 150]]);
    });
});
