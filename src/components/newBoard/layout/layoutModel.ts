/**
 * The New tab is a tree: top-level section widgets, each a full row, holding widgets and further
 * sections. Everything here is pure so the editor, the store and the tests share one set of rules.
 */
/** Columns taken in the parent row. Every row is four columns wide. */
export type WidgetSize = 1 | 2 | 3 | 4;
export const ROW_COLUMNS = 4;
export type BuiltinWidgetType = 'pulse' | 'create' | 'shells' | 'examples' | 'recent' | 'clock' | 'weather' | 'calendar' | 'references' | 'sdk';

export interface SectionNode {
    id: string;
    kind: 'section';
    title: string;
    /** The grey line on the right of the title. Dropped when the user retitles the section. */
    note?: string;
    /** Share of the parent row. Ignored for top-level sections, which always take the whole row. */
    size: WidgetSize;
    /** Height of the section's content in px, set by dragging its bottom edge. Absent means as tall as its widgets. */
    height?: number;
    children: LayoutNode[];
}

export const SECTION_MIN_HEIGHT = 80;
export const SECTION_MAX_HEIGHT = 1600;
export const clampSectionHeight = (aValue: number) => Math.round(Math.min(SECTION_MAX_HEIGHT, Math.max(SECTION_MIN_HEIGHT, aValue)));

export interface WidgetNode {
    id: string;
    kind: 'widget';
    /** `group` shows a group of shortcuts; `item` is one shortcut (a timer, a package, ...), described by `settings`. */
    type: BuiltinWidgetType | 'group' | 'item';
    size: WidgetSize;
    groupId?: string;
    /** Per-widget options, e.g. a clock's time zone or a weather widget's place. */
    settings?: Record<string, unknown>;
}

export type LayoutNode = SectionNode | WidgetNode;

export const LAYOUT_VERSION = 1;
/** A top-level section is depth 1; nothing may sit deeper than this many sections. */
export const MAX_SECTION_DEPTH = 3;

export const BUILTIN_WIDGETS: Record<BuiltinWidgetType, { title: string; description: string; sizes: WidgetSize[]; note: string; multiple?: boolean }> = {
    pulse: { title: 'Server pulse', description: 'Live CPU, memory and append rate', sizes: [2, 4], note: '_NEO_STATZ · every minute · last 1 hour' },
    create: { title: 'Create new', description: 'Dashboard, SQL, TQL and more', sizes: [2, 3, 4], note: 'Each card shows what you will end up with' },
    shells: { title: 'Shells', description: 'Terminals on the server', sizes: [2, 3, 4], note: 'Terminals on the server, opened in a tab' },
    examples: { title: 'Try it in one click', description: 'Runnable examples', sizes: [2, 3, 4], note: 'Works on a fresh server, no tables to create' },
    recent: { title: 'Recent', description: 'Files you opened or saved', sizes: [1, 2, 3, 4], note: 'On this browser' },
    // The References side panel's link lists, as the server serves them (/api/refs).
    references: { title: 'References', description: 'Docs, SQL reference, tutorials', sizes: [1, 2, 3, 4], note: 'Opens in your browser' },
    sdk: { title: 'SDK', description: 'Client libraries and connectors', sizes: [1, 2, 3, 4], note: 'Opens in your browser' },
    // Clocks and weather can be placed many times, one per time zone or place.
    clock: { title: 'Clock', description: 'Analog or digital, in any time zone', sizes: [1, 2], note: '', multiple: true },
    weather: { title: 'Weather', description: 'Current weather for a place (needs internet)', sizes: [1, 2], note: '', multiple: true },
    calendar: { title: 'Calendar', description: 'This month at a glance', sizes: [1, 2], note: '', multiple: true },
};
export const GROUP_WIDGET_SIZES: WidgetSize[] = [1, 2, 3, 4];
export const ITEM_WIDGET_SIZES: WidgetSize[] = [1, 2];

/** Sizes a widget may take; unknown types get every size. */
export const widgetSizes = (aType: WidgetNode['type']): WidgetSize[] =>
    aType === 'group' ? GROUP_WIDGET_SIZES : aType === 'item' ? ITEM_WIDGET_SIZES : BUILTIN_WIDGETS[aType]?.sizes ?? [1, 2, 3, 4];

/** What an `item` widget points at. The kinds are the group item kinds; kept as text here so this module stays free of them. */
export interface ItemWidgetSettings {
    kind: string;
    ref: string;
    label: string;
}
export const isItemSettings = (aValue: unknown): aValue is ItemWidgetSettings =>
    !!aValue && typeof (aValue as any).kind === 'string' && typeof (aValue as any).ref === 'string' && !!(aValue as any).ref && typeof (aValue as any).label === 'string';
export const SECTION_SIZES: WidgetSize[] = [1, 2, 3, 4];

let sSeq = 0;
export const newNodeId = (aPrefix: 'sec' | 'wid') => `${aPrefix}-${Date.now().toString(36)}-${(sSeq++).toString(36)}`;

export const createSection = (aTitle = '', aChildren: LayoutNode[] = [], aSize: WidgetSize = 4, aNote?: string): SectionNode => ({
    id: newNodeId('sec'),
    kind: 'section',
    title: aTitle,
    ...(aNote ? { note: aNote } : {}),
    size: aSize,
    children: aChildren,
});

const defaultSize = (aType: WidgetNode['type']): WidgetSize => {
    if (aType === 'group') return 2;
    if (aType === 'item') return 1;
    const sSizes = BUILTIN_WIDGETS[aType].sizes;
    return sSizes.includes(4) ? 4 : sSizes[0];
};

export const createWidget = (aType: WidgetNode['type'], aSize?: WidgetSize, aGroupId?: string, aSettings?: Record<string, unknown>): WidgetNode => ({
    id: newNodeId('wid'),
    kind: 'widget',
    type: aType,
    size: aSize ?? defaultSize(aType),
    ...(aGroupId ? { groupId: aGroupId } : {}),
    ...(aSettings ? { settings: aSettings } : {}),
});

const builtinSection = (aType: BuiltinWidgetType, aSize: WidgetSize = 4, aExtra: LayoutNode[] = []) =>
    createSection(BUILTIN_WIDGETS[aType].title, [createWidget(aType, 4), ...aExtra], aSize, BUILTIN_WIDGETS[aType].note);

/** What a user who never pressed Customize sees. */
export const createDefaultLayout = (): SectionNode[] => [
    builtinSection('pulse'),
    builtinSection('create', 4, [builtinSection('shells')]),
    createSection('', [builtinSection('examples', 2), builtinSection('recent', 2)]),
];

// ---------- reading ----------

export interface FoundNode {
    node: LayoutNode;
    /** The array that holds it: the root array, or its parent section's children. */
    list: LayoutNode[];
    index: number;
    parent: SectionNode | undefined;
    /** Number of sections above it (0 for a top-level section). */
    depth: number;
}

export const findNode = (aNodes: LayoutNode[], aId: string, aParent?: SectionNode, aDepth = 0): FoundNode | undefined => {
    for (let i = 0; i < aNodes.length; i++) {
        const sNode = aNodes[i];
        if (sNode.id === aId) return { node: sNode, list: aNodes, index: i, parent: aParent, depth: aDepth };
        if (sNode.kind === 'section') {
            const sFound = findNode(sNode.children, aId, sNode, aDepth + 1);
            if (sFound) return sFound;
        }
    }
    return undefined;
};

export const walkNodes = (aNodes: LayoutNode[], aVisit: (aNode: LayoutNode) => void) => {
    aNodes.forEach((aNode) => {
        aVisit(aNode);
        if (aNode.kind === 'section') walkNodes(aNode.children, aVisit);
    });
};

/** Widgets that may appear only once: every built-in, and each group. */
export const placedWidgetKeys = (aNodes: LayoutNode[]) => {
    const sKeys = new Set<string>();
    walkNodes(aNodes, (aNode) => {
        if (aNode.kind === 'widget' && !isRepeatable(aNode.type)) sKeys.add(widgetKey(aNode));
    });
    return sKeys;
};
const isRepeatable = (aType: WidgetNode['type']) => aType !== 'group' && aType !== 'item' && !!BUILTIN_WIDGETS[aType].multiple;

export const widgetKey = (aNode: Pick<WidgetNode, 'type' | 'groupId' | 'settings'>) => {
    if (aNode.type === 'group') return `group:${aNode.groupId}`;
    if (aNode.type === 'item' && isItemSettings(aNode.settings)) return `item:${aNode.settings.kind}:${aNode.settings.ref}`;
    return aNode.type;
};

/** Sections stacked inside a node, counting itself: a widget is 0, an empty section is 1. */
export const sectionHeight = (aNode: LayoutNode): number => (aNode.kind === 'section' ? 1 + Math.max(0, ...aNode.children.map(sectionHeight)) : 0);

const containsNode = (aSection: SectionNode, aId: string) => !!findNode(aSection.children, aId);

// ---------- writing (all return a new tree; the input is never touched) ----------

const clone = (aNodes: SectionNode[]): SectionNode[] => structuredClone(aNodes);

export type LayoutResult = { ok: true; nodes: SectionNode[] } | { ok: false; reason: string };

/**
 * Put `aNode` into section `aParentId` (or at the top level when undefined) at `aIndex` (end when
 * undefined). A widget dropped at the top level is wrapped in a section of its own, titled after
 * it when it is a built-in.
 */
export const insertNode = (aNodes: SectionNode[], aNode: LayoutNode, aParentId?: string, aIndex?: number): LayoutResult => {
    const sNodes = clone(aNodes);
    if (!aParentId) {
        const sSection: SectionNode =
            aNode.kind === 'section'
                ? { ...aNode, size: 4 }
                : aNode.type === 'group' || aNode.type === 'item'
                ? createSection('', [aNode])
                : BUILTIN_WIDGETS[aNode.type].multiple
                ? createSection('', [aNode])
                : createSection(BUILTIN_WIDGETS[aNode.type].title, [{ ...aNode, size: 4 }], 4, BUILTIN_WIDGETS[aNode.type].note);
        if (sectionHeight(sSection) > MAX_SECTION_DEPTH) return { ok: false, reason: `Sections can be nested ${MAX_SECTION_DEPTH} deep at most.` };
        sNodes.splice(aIndex === undefined ? sNodes.length : Math.max(0, Math.min(aIndex, sNodes.length)), 0, sSection);
        return { ok: true, nodes: sNodes };
    }
    const sTarget = findNode(sNodes, aParentId);
    if (!sTarget || sTarget.node.kind !== 'section') return { ok: false, reason: 'That section no longer exists.' };
    if (sTarget.depth + 1 + sectionHeight(aNode) > MAX_SECTION_DEPTH) return { ok: false, reason: `Sections can be nested ${MAX_SECTION_DEPTH} deep at most.` };
    const sChildren = sTarget.node.children;
    sChildren.splice(aIndex === undefined ? sChildren.length : Math.max(0, Math.min(aIndex, sChildren.length)), 0, aNode);
    return { ok: true, nodes: sNodes };
};

export const removeNode = (aNodes: SectionNode[], aId: string): LayoutResult => {
    const sNodes = clone(aNodes);
    const sFound = findNode(sNodes, aId);
    if (!sFound) return { ok: false, reason: 'Already removed.' };
    sFound.list.splice(sFound.index, 1);
    return { ok: true, nodes: sNodes };
};

/** Move an existing node to section `aParentId` (top level when undefined) at `aIndex` of the list as it is before the move. */
export const moveNode = (aNodes: SectionNode[], aId: string, aParentId?: string, aIndex?: number): LayoutResult => {
    const sFound = findNode(aNodes, aId);
    if (!sFound) return { ok: false, reason: 'That item no longer exists.' };
    if (aParentId && (aParentId === aId || (sFound.node.kind === 'section' && containsNode(sFound.node, aParentId)))) {
        return { ok: false, reason: 'A section cannot go inside itself.' };
    }
    const sSameList = (sFound.parent?.id ?? undefined) === aParentId;
    // Taking the node out first shifts every later slot in the same list up by one.
    const sIndex = aIndex !== undefined && sSameList && sFound.index < aIndex ? aIndex - 1 : aIndex;
    const sRemoved = removeNode(aNodes, aId);
    if (!sRemoved.ok) return sRemoved;
    return insertNode(sRemoved.nodes, sFound.node, aParentId, sIndex);
};

/** Swap with the previous (-1) or next (+1) sibling. */
export const shiftNode = (aNodes: SectionNode[], aId: string, aStep: -1 | 1): LayoutResult => {
    const sNodes = clone(aNodes);
    const sFound = findNode(sNodes, aId);
    if (!sFound) return { ok: false, reason: 'That item no longer exists.' };
    const sTo = sFound.index + aStep;
    if (sTo < 0 || sTo >= sFound.list.length) return { ok: false, reason: aStep < 0 ? 'Already first.' : 'Already last.' };
    [sFound.list[sFound.index], sFound.list[sTo]] = [sFound.list[sTo], sFound.list[sFound.index]];
    return { ok: true, nodes: sNodes };
};

export const updateNode = (aNodes: SectionNode[], aId: string, aPatch: Partial<SectionNode> | Partial<WidgetNode>): SectionNode[] => {
    const sNodes = clone(aNodes);
    const sFound = findNode(sNodes, aId);
    if (sFound) Object.assign(sFound.node, aPatch);
    return sNodes;
};

/** Drop every widget of a deleted group. */
/**
 * The layout as an account that cannot use some widgets sees it: those widgets are left out, and a
 * section left with nothing to show goes too. A section that was empty to begin with stays, as it
 * always has. Nothing is removed from the saved layout; this is only what is drawn.
 */
export const hideUnavailable = (aNodes: SectionNode[], aAvailable: (aWidget: WidgetNode) => boolean): SectionNode[] => {
    const prune = (aNode: LayoutNode): LayoutNode | undefined => {
        if (aNode.kind === 'widget') return aAvailable(aNode) ? aNode : undefined;
        if (!aNode.children.length) return aNode;
        const sChildren = aNode.children.map(prune).filter((aChild): aChild is LayoutNode => !!aChild);
        return sChildren.length ? { ...aNode, children: sChildren } : undefined;
    };
    return aNodes.map(prune).filter((aNode): aNode is SectionNode => !!aNode);
};

export const removeGroupWidgets = (aNodes: SectionNode[], aGroupId: string): SectionNode[] => {
    const sStrip = (aList: LayoutNode[]): LayoutNode[] =>
        aList
            .filter((aNode) => !(aNode.kind === 'widget' && aNode.type === 'group' && aNode.groupId === aGroupId))
            .map((aNode) => (aNode.kind === 'section' ? { ...aNode, children: sStrip(aNode.children) } : aNode));
    return sStrip(aNodes) as SectionNode[];
};

// ---------- loading a saved layout ----------

/** Layouts saved before rows were four columns used letters; read them as the nearest column count. */
const LEGACY_SIZES: Record<string, WidgetSize> = { XS: 1, S: 1, M: 2, L: 4 };
const toSize = (aValue: unknown): WidgetSize | undefined => {
    if (aValue === 1 || aValue === 2 || aValue === 3 || aValue === 4) return aValue;
    return typeof aValue === 'string' ? LEGACY_SIZES[aValue] : undefined;
};
const WIDGET_TYPES = new Set<string>([...Object.keys(BUILTIN_WIDGETS), 'group', 'item']);

/**
 * Rebuild a layout read from the server, keeping only what this build understands: unknown widget
 * types, malformed nodes and anything nested past the limit are dropped rather than crashing the tab.
 * Returns undefined when nothing usable is left, so the caller falls back to the default.
 */
export const parseLayout = (aRaw: unknown): SectionNode[] | undefined => {
    const sNodes = (aRaw as any)?.nodes;
    if (!Array.isArray(sNodes)) return undefined;
    const sSeen = new Set<string>();
    const sParse = (aNode: any, aDepth: number): LayoutNode | undefined => {
        if (!aNode || typeof aNode !== 'object') return undefined;
        const sSize: WidgetSize = toSize(aNode.size) ?? 4;
        const sId = typeof aNode.id === 'string' && aNode.id && !sSeen.has(aNode.id) ? aNode.id : newNodeId(aNode.kind === 'section' ? 'sec' : 'wid');
        sSeen.add(sId);
        if (aNode.kind === 'section') {
            if (aDepth >= MAX_SECTION_DEPTH) return undefined;
            const sChildren = Array.isArray(aNode.children) ? aNode.children.map((aChild: any) => sParse(aChild, aDepth + 1)).filter(Boolean) : [];
            return {
                id: sId,
                kind: 'section',
                title: typeof aNode.title === 'string' ? aNode.title : '',
                ...(typeof aNode.note === 'string' && aNode.note ? { note: aNode.note } : {}),
                size: sSize,
                ...(typeof aNode.height === 'number' && Number.isFinite(aNode.height) ? { height: clampSectionHeight(aNode.height) } : {}),
                children: sChildren,
            };
        }
        if (aNode.kind === 'widget' && WIDGET_TYPES.has(aNode.type)) {
            if (aNode.type === 'group' && (typeof aNode.groupId !== 'string' || !aNode.groupId)) return undefined;
            if (aNode.type === 'item' && !isItemSettings(aNode.settings)) return undefined;
            const sAllowed = widgetSizes(aNode.type);
            return {
                id: sId,
                kind: 'widget',
                type: aNode.type,
                size: sAllowed.includes(sSize) ? sSize : [...sAllowed].reverse().find((aOne) => aOne <= sSize) ?? sAllowed[0],
                ...(aNode.type === 'group' ? { groupId: aNode.groupId } : {}),
                ...(aNode.settings && typeof aNode.settings === 'object' && !Array.isArray(aNode.settings) ? { settings: aNode.settings } : {}),
            };
        }
        return undefined;
    };
    const sRoot = sNodes
        .map((aNode: any) => sParse(aNode, 0))
        .filter((aNode: LayoutNode | undefined): aNode is LayoutNode => !!aNode)
        .map((aNode: LayoutNode) => (aNode.kind === 'section' ? { ...aNode, size: 4 as WidgetSize } : createSection('', [aNode])));
    return sRoot;
};

export const serializeLayout = (aNodes: SectionNode[]) => ({ version: LAYOUT_VERSION, nodes: aNodes });
