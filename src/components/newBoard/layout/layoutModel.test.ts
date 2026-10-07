import {
    createDefaultLayout,
    createSection,
    createWidget,
    findNode,
    hideUnavailable,
    insertNode,
    LayoutNode,
    MAX_SECTION_DEPTH,
    moveNode,
    parseLayout,
    placedWidgetKeys,
    removeGroupWidgets,
    removeNode,
    SectionNode,
    serializeLayout,
    shiftNode,
    updateNode,
    WidgetNode,
} from './layoutModel';

const titles = (aNodes: SectionNode[]) => aNodes.map((aNode) => aNode.title);
const ok = (aResult: ReturnType<typeof insertNode>) => {
    if (!aResult.ok) throw new Error(aResult.reason);
    return aResult.nodes;
};

describe('createDefaultLayout', () => {
    it('is the New tab before anyone customised it', () => {
        const sNodes = createDefaultLayout();
        expect(titles(sNodes)).toEqual(['Server pulse', 'Create new', '']);
        const [sPulse, sCreate, sBottom] = sNodes;
        expect(sPulse.children).toEqual([expect.objectContaining({ kind: 'widget', type: 'pulse' })]);
        // Shells sit inside Create new, as a section of their own.
        expect(sCreate.children.map((aChild) => (aChild.kind === 'section' ? aChild.title : aChild.type))).toEqual(['create', 'Shells']);
        // The last row holds two half-width sections side by side.
        expect(sBottom.children.map((aChild) => [aChild.kind === 'section' && aChild.title, aChild.size])).toEqual([
            ['Try it in one click', 2],
            ['Recent', 2],
        ]);
    });

    it('marks every built-in as placed so the panel will not add it twice', () => {
        expect([...placedWidgetKeys(createDefaultLayout())].sort()).toEqual(['create', 'examples', 'pulse', 'recent', 'shells']);
    });
});

describe('insertNode', () => {
    it('wraps a widget dropped at the top level in a section titled after it', () => {
        const sNodes = ok(insertNode([], createWidget('recent')));
        expect(sNodes).toHaveLength(1);
        expect(sNodes[0]).toMatchObject({ kind: 'section', title: 'Recent', size: 4 });
        expect(sNodes[0].children[0]).toMatchObject({ type: 'recent' });
    });

    it('leaves clocks, weather and calendars untitled when wrapped, and lets them repeat', () => {
        let sNodes = ok(insertNode([], createWidget('clock')));
        sNodes = ok(insertNode(sNodes, createWidget('clock'), sNodes[0].id));
        expect(sNodes[0].title).toBe('');
        expect(sNodes[0].children).toHaveLength(2);
        expect(placedWidgetKeys(sNodes).has('clock')).toBe(false);
    });

    it('puts a node at the requested place in a section', () => {
        const sSection = createSection('A', [createWidget('pulse'), createWidget('recent')]);
        const sNodes = ok(insertNode([sSection], createWidget('clock'), sSection.id, 1));
        expect(sNodes[0].children.map((aChild) => aChild.kind === 'widget' && aChild.type)).toEqual(['pulse', 'clock', 'recent']);
    });

    it(`refuses sections deeper than ${MAX_SECTION_DEPTH}`, () => {
        const sDeep = createSection('2', [createSection('3')]);
        const sTop = createSection('1', [sDeep]);
        const sResult = insertNode([sTop], createSection('4'), sDeep.children[0].id);
        expect(sResult.ok).toBe(false);
    });

    it('never touches the tree it was given', () => {
        const sNodes = createDefaultLayout();
        const sBefore = JSON.stringify(sNodes);
        insertNode(sNodes, createWidget('clock'), sNodes[0].id);
        expect(JSON.stringify(sNodes)).toBe(sBefore);
    });
});

describe('item widgets', () => {
    it('places each shortcut once, keyed by what it points at', () => {
        const sTimer = createWidget('item', undefined, undefined, { kind: 'timer', ref: '12', label: 'DB_ROLL' });
        const sNodes = ok(insertNode([], sTimer));
        expect(sNodes[0]).toMatchObject({ title: '', children: [expect.objectContaining({ type: 'item', size: 1 })] });
        expect([...placedWidgetKeys(sNodes)]).toEqual(['item:timer:12']);
    });

    it('is dropped on load when it no longer says what it points at', () => {
        const sParsed = parseLayout({
            nodes: [{ kind: 'section', children: [{ kind: 'widget', type: 'item', settings: { kind: 'package', ref: 'neo-pkg-coin', label: 'neo-pkg-coin' } }, { kind: 'widget', type: 'item', settings: { kind: 'timer' } }] }],
        });
        expect(sParsed?.[0].children).toEqual([expect.objectContaining({ type: 'item', settings: { kind: 'package', ref: 'neo-pkg-coin', label: 'neo-pkg-coin' } })]);
    });
});

describe('moveNode', () => {
    it('moves a top-level section to another slot', () => {
        const sNodes = [createSection('A'), createSection('B'), createSection('C')];
        expect(titles(ok(moveNode(sNodes, sNodes[2].id, undefined, 0)))).toEqual(['C', 'A', 'B']);
        // A slot after the node's own place counts in the list as it was before the move.
        expect(titles(ok(moveNode(sNodes, sNodes[0].id, undefined, 3)))).toEqual(['B', 'C', 'A']);
    });

    it('nests a section inside another one', () => {
        const sNodes = [createSection('A'), createSection('B')];
        const sMoved = ok(moveNode(sNodes, sNodes[1].id, sNodes[0].id));
        expect(titles(sMoved)).toEqual(['A']);
        expect(sMoved[0].children[0]).toMatchObject({ kind: 'section', title: 'B' });
    });

    it('will not put a section inside itself', () => {
        const sInner = createSection('inner');
        const sNodes = [createSection('outer', [sInner])];
        expect(moveNode(sNodes, sNodes[0].id, sInner.id).ok).toBe(false);
    });
});

describe('removeNode, shiftNode and updateNode', () => {
    it('removes a section together with what is inside', () => {
        const sNodes = createDefaultLayout();
        const sRemoved = ok(removeNode(sNodes, sNodes[1].id));
        expect(titles(sRemoved)).toEqual(['Server pulse', '']);
        expect(placedWidgetKeys(sRemoved).has('shells')).toBe(false);
    });

    it('swaps neighbours and stops at the ends', () => {
        const sNodes = [createSection('A'), createSection('B')];
        expect(titles(ok(shiftNode(sNodes, sNodes[1].id, -1)))).toEqual(['B', 'A']);
        expect(shiftNode(sNodes, sNodes[0].id, -1).ok).toBe(false);
    });

    it('patches one node', () => {
        const sNodes = [createSection('A', [createWidget('clock')])];
        const sWidget = sNodes[0].children[0];
        const sUpdated = updateNode(sNodes, sWidget.id, { settings: { style: 'digital' } });
        expect(findNode(sUpdated, sWidget.id)?.node).toMatchObject({ settings: { style: 'digital' } });
    });

    it('drops the widgets of a deleted group everywhere', () => {
        const sNodes = [createSection('A', [createWidget('group', 2, 'g1'), createSection('B', [createWidget('group', 1, 'g1'), createWidget('group', 1, 'g2')])])];
        const sLeft = removeGroupWidgets(sNodes, 'g1');
        expect([...placedWidgetKeys(sLeft)]).toEqual(['group:g2']);
    });
});

describe('parseLayout', () => {
    it('reads sizes saved as letters before rows were four columns', () => {
        const sParsed = parseLayout({
            nodes: [{ kind: 'section', children: [{ kind: 'widget', type: 'clock', size: 'XS' }, { kind: 'widget', type: 'group', groupId: 'g', size: 'M' }, { kind: 'widget', type: 'recent', size: 'L' }, { kind: 'section', size: 'S', children: [] }] }],
        });
        expect(sParsed?.[0].children.map((aChild) => aChild.size)).toEqual([1, 2, 4, 1]);
    });

    it('reads back what it wrote', () => {
        const sNodes = createDefaultLayout();
        expect(parseLayout(JSON.parse(JSON.stringify(serializeLayout(sNodes))))).toEqual(sNodes);
    });

    it('drops what this build does not understand instead of failing', () => {
        const sParsed = parseLayout({
            nodes: [
                { id: 'a', kind: 'section', title: 'Kept', size: 'XL', children: [{ kind: 'widget', type: 'hologram' }, { kind: 'widget', type: 'group' }, { kind: 'widget', type: 'clock', size: 'L' }] },
                { kind: 'widget', type: 'recent' },
                'junk',
            ],
        });
        expect(sParsed).toHaveLength(2);
        expect(sParsed?.[0]).toMatchObject({ title: 'Kept', size: 4 });
        // Unknown types and a group with no id are gone; a size the widget cannot take is clamped (clock: 1-2 columns).
        expect(sParsed?.[0].children).toEqual([expect.objectContaining({ type: 'clock', size: 2 })]);
        // A loose widget at the top level gets a section around it.
        expect(sParsed?.[1]).toMatchObject({ kind: 'section', children: [expect.objectContaining({ type: 'recent' })] });
    });

    it('cuts sections nested past the limit and fixes duplicate ids', () => {
        const sParsed = parseLayout({
            nodes: [{ id: 'x', kind: 'section', children: [{ id: 'x', kind: 'section', children: [{ kind: 'section', children: [{ kind: 'section', children: [] }] }] }] }],
        });
        const sTop = sParsed![0];
        const sSecond = sTop.children[0] as SectionNode;
        expect(sSecond.id).not.toBe(sTop.id);
        expect((sSecond.children[0] as SectionNode).children).toEqual([]);
    });

    it('answers undefined for something that is not a layout', () => {
        expect(parseLayout(undefined)).toBeUndefined();
        expect(parseLayout({ nodes: 'no' })).toBeUndefined();
    });
});

describe('hideUnavailable', () => {
    const w = (aId: string, aType: WidgetNode['type']): WidgetNode => ({ id: aId, kind: 'widget', type: aType, size: 1 });
    const s = (aId: string, aChildren: LayoutNode[]): SectionNode => ({ id: aId, kind: 'section', title: aId, size: 4, children: aChildren });
    const noPulse = (aWidget: WidgetNode) => aWidget.type !== 'pulse';

    it('drops a section whose only content cannot be shown, keeps the rest of a mixed one', () => {
        const sOut = hideUnavailable([s('only', [w('p', 'pulse')]), s('mixed', [w('p2', 'pulse'), w('c', 'clock')]), s('free', [w('r', 'recent')])], noPulse);
        expect(sOut.map((aSection) => aSection.id)).toEqual(['mixed', 'free']);
        expect(sOut[0].children.map((aChild) => aChild.id)).toEqual(['c']);
    });

    it('drops nested sections left empty, and their parent when nothing else remains', () => {
        expect(hideUnavailable([s('outer', [s('inner', [w('p', 'pulse')])])], noPulse)).toEqual([]);
        const [sOuter] = hideUnavailable([s('outer', [s('inner', [w('p', 'pulse')]), w('c', 'clock')])], noPulse);
        expect(sOuter.children.map((aChild) => aChild.id)).toEqual(['c']);
    });

    it('keeps a section that was empty to begin with, and leaves the input untouched', () => {
        const sNodes = [s('empty', []), s('only', [w('p', 'pulse')])];
        expect(hideUnavailable(sNodes, noPulse).map((aSection) => aSection.id)).toEqual(['empty']);
        expect(sNodes[1].children).toHaveLength(1);
    });
});
