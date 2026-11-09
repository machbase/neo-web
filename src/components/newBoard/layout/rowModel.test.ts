import { createSection, createWidget, findNode, SECTION_MAX_HEIGHT, SECTION_MIN_HEIGHT, SectionNode, WidgetSize } from './layoutModel';
import { besideOwnHeight, besideSections, EMPTY_BODY, growthLimit, heldWithWidget, holdersAfter, leastSavedHeight, NESTED_HEAD, ownRowHeight, packRows, ROW_GAP, setWidgetHeight, shapeOf, widgetRowHeight } from './rowModel';

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

describe('packRows on a section\'s own columns (#1572)', () => {
    it('a row is as many columns as the section is wide', () => {
        const sSection = createSection('', [createWidget('recent', 1), createWidget('sdk', 1), createWidget('references', 1)], 2);
        expect(packRows(sSection).map((aRow) => aRow.length)).toEqual([2, 1]);
    });
});

describe('a widget\'s own height (#1572)', () => {
    const tall = (aHeight: number) => ({ ...widget(1), height: aHeight });

    it('makes its row the tallest own height, and a row without one has none', () => {
        expect(ownRowHeight([tall(200), tall(120), widget(1)])).toBe(200);
        expect(ownRowHeight([widget(1)])).toBeUndefined();
    });
    it('counts in the least height of the section', () => {
        expect(leastSavedHeight(section([tall(200)]))).toBe(200);
        expect(leastSavedHeight(section([tall(40)]))).toBe(SECTION_MIN_HEIGHT);
    });
    it('is taken out of what the other rows share', () => {
        const sSection = section([{ ...widget(4), height: 200 }, widget(4), widget(4)], 4, 600);
        expect(widgetRowHeight(sSection, 600)).toBe(Math.floor((600 - ROW_GAP * 2 - 200) / 2));
    });
    it('grows a holder by what its slack does not cover, and never shrinks it', () => {
        const sHolders = [{ id: 'inner', height: 100, slack: 40 }, { id: 'outer', height: 150, slack: 90 }];
        expect(holdersAfter(sHolders, 30)).toEqual([]);
        expect(holdersAfter(sHolders, 60)).toEqual([{ id: 'inner', height: 120 }]);
        expect(holdersAfter(sHolders, 100)).toEqual([{ id: 'inner', height: 160 }, { id: 'outer', height: 160 }]);
        expect(holdersAfter(sHolders, -50)).toEqual([]);
    });
    it('stops a widget where the section holding it reaches the height limit', () => {
        expect(growthLimit([{ id: 'a', height: SECTION_MAX_HEIGHT - 100, slack: 20 }, { id: 'b', height: 300, slack: 0 }])).toBe(120);
        expect(growthLimit([])).toBe(Infinity);
    });
    it('tells the widgets beside one how tall it makes their row', () => {
        const sPlain = widget(1);
        const sOwn = tall(200);
        const sOther = widget(4);
        expect([...besideOwnHeight(section([sPlain, sOwn, sOther], 4, 400)).entries()]).toEqual([[sPlain.id, 200]]);
    });
    it('holds the rest of the row, not the other rows, in a section that grows with its content', () => {
        const sDragged = widget(1);
        const sBeside = widget(1);
        const sAlready = tall(150);
        const sNextRow = widget(4);
        expect(heldWithWidget(section([sDragged, sBeside, sAlready, sNextRow]), sDragged.id)).toEqual([sBeside]);
    });
    it('holds every widget in a section of set height, whose rows share it', () => {
        const sDragged = widget(4);
        const sNextRow = widget(4);
        expect(heldWithWidget(section([sDragged, sNextRow], 4, 400), sDragged.id)).toEqual([sNextRow]);
    });
    it('gives the held widgets the height they were drawn at', () => {
        const sDragged = widget(1);
        const sBeside = widget(1);
        const sNodes = setWidgetHeight([section([sDragged, sBeside])], sDragged.id, 300, [{ id: sBeside.id, height: 216 }]);
        expect(findNode(sNodes, sDragged.id)!.node).toMatchObject({ height: 300 });
        expect(findNode(sNodes, sBeside.id)!.node).toMatchObject({ height: 216 });
    });
    it('leaves a section without a set height alone', () => {
        const sWidget = widget(1);
        const sSection = section([sWidget]);
        expect(findNode(setWidgetHeight([sSection], sWidget.id, 300), sSection.id)!.node).not.toHaveProperty('height');
    });
});
