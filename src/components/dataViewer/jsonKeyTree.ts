import { jsonSampleValueType } from '@/utils/dashboardJsonValue';
import { jsonKeyTypeLabel } from '@/utils/jsonKeyCatalog';

/**
 * One row's JSON document, as a pickable tree.
 *
 * The whole key discovery problem collapses into this function: a row already carries its complete
 * structure, so nothing has to be scanned, stored or kept in step with a table that keeps changing.
 * The tree is built from the document the user opened and thrown away when the modal closes.
 */

export type JsonKeyTreeNode = {
    /** Bracket path, quoted where a key needs it. Doubles as the selection id within one row. */
    path: string;
    /** The key itself, shown as-is — never truncated, since sibling keys share long prefixes. */
    label: string;
    /**
     * The same position written the way people say it: `sensor.temperature.value`.
     *
     * Bracket form is what the database reads; this is what the filter matches and what the header
     * of the detail view names. Keeping both means neither reader has to re-parse the other's.
     */
    dotted: string;
    /** `dotted` of the parent, shown dimmed ahead of the key when the filter flattens the tree. */
    parentDotted: string;
    depth: number;
    /**
     * Whether this node holds a value rather than more structure.
     *
     * Only a leaf is selectable: an object or an array is not a series, and offering it would put a
     * document on an axis that expects a number.
     */
    leaf: boolean;
    /** `NUMBER` / `STRING` / `BOOLEAN`, or empty when there is nothing worth naming. */
    dataType: string;
    /**
     * Whether the chart would be able to draw this leaf.
     *
     * Not the same question as the badge beside it. A payload that writes its readings as `"23.5"`
     * is a STRING document and the badge says so, but the value axis takes it happily — so this
     * flag answers what the chart will do, and the badge answers what the row contains. Deciding
     * the gate off the badge instead would leave such a payload permanently unchartable.
     */
    numeric: boolean;
    /** `object · 4` on a branch; the value itself on a leaf. */
    preview: string;
    /** Present on non-leaf nodes so the tree can be folded. */
    childCount: number;
};

/**
 * Anything holding more structure is walked into — objects and arrays alike.
 *
 * The tree is built from the row the user opened, parsed as it is, so every position in that row is
 * a real path: `[items][0][a]` addresses something that is actually there. Whether the next row has
 * the same number of elements is the same question as whether it has the same keys, which is not an
 * array problem. And an array holding objects has to be walked, or everything inside it is
 * unreachable.
 */
const isContainer = (value: unknown) => value !== null && typeof value === 'object';

const segment = (key: string) => (/[[\]']/.test(key) ? `['${key.replace(/'/g, "''")}']` : `[${key}]`);

const entriesOf = (value: object): (readonly [string, unknown])[] =>
    Array.isArray(value)
        ? value.map((item, index) => [String(index), item] as const)
        : Object.entries(value as Record<string, unknown>);

/** What a branch holds, said in the row rather than left to be counted by opening it. */
const branchPreview = (value: object, count: number) => `${Array.isArray(value) ? 'array' : 'object'} · ${count}`;

/** A leaf's value as one line. Never truncated here — the column ellipsises, the tooltip carries it whole. */
const leafPreview = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return value;
    return String(value);
};

/** See `JsonKeyTreeNode.numeric`: what the chart can draw, not what the document declares. */
const isChartable = (value: unknown): boolean => {
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return trimmed.length > 0 && Number.isFinite(Number(trimmed));
};

/**
 * Parse a stored JSON value, however it arrives.
 *
 * Machbase returns a JSON column as text, but a row that has already been through a JSON transport
 * may arrive as a parsed object. Both are accepted so the caller does not have to care.
 */
export const parseJsonKeyDocument = (value: unknown): unknown => {
    if (isContainer(value)) return value;
    if (typeof value !== 'string') return undefined;
    try {
        return JSON.parse(value);
    } catch {
        return undefined;
    }
};

/**
 * Flatten a document into rows, depth-first, in document order.
 *
 * Containers are branches; everything else is a leaf. See `isContainer`.
 *
 * `rootLabel` names the one row a keyless document produces — see below.
 */
export const buildJsonKeyTree = (document: unknown, rootLabel = 'VALUE'): JsonKeyTreeNode[] => {
    const nodes: JsonKeyTreeNode[] = [];

    const walk = (value: unknown, prefix: string, dotted: string, parentDotted: string, label: string, depth: number) => {
        if (isContainer(value)) {
            const entries = entriesOf(value as object);
            nodes.push({
                path: prefix,
                label,
                dotted,
                parentDotted,
                depth,
                leaf: false,
                dataType: '',
                numeric: false,
                preview: branchPreview(value as object, entries.length),
                childCount: entries.length,
            });
            for (const [key, child] of entries) {
                walk(child, `${prefix}${segment(key)}`, `${dotted}.${key}`, dotted, key, depth + 1);
            }
            return;
        }

        nodes.push({
            path: prefix,
            label,
            dotted,
            parentDotted,
            depth,
            leaf: true,
            dataType: jsonKeyTypeLabel(jsonSampleValueType(value)),
            numeric: isChartable(value),
            preview: leafPreview(value),
            childCount: 0,
        });
    };

    const parsed = parseJsonKeyDocument(document);

    /**
     * A document that is a bare value — `123`, `"text"`, `true` — which JSON allows at the top.
     *
     * There is no key in it to pick, but the value is right there on the tag and reads over time
     * like any other series, so the document itself is the one thing on offer. Its path is empty,
     * which is how every reader downstream knows to take the column as it stands instead of
     * projecting a key out of it.
     */
    if (parsed !== undefined && parsed !== null && !isContainer(parsed)) {
        return [
            {
                path: '',
                label: rootLabel,
                dotted: rootLabel,
                parentDotted: '',
                depth: 0,
                leaf: true,
                dataType: jsonKeyTypeLabel(jsonSampleValueType(parsed)),
                numeric: isChartable(parsed),
                preview: leafPreview(parsed),
                childCount: 0,
            },
        ];
    }

    if (!isContainer(parsed)) return [];

    // The root itself is not a row — a document is the thing being explored, not a node in it. A
    // document that is an array at the top has one entry per position, since there is no key there.
    for (const [key, child] of entriesOf(parsed as object)) walk(child, segment(key), key, '', key, 0);

    return nodes;
};

/**
 * The leaves under one node — the node itself when it is a leaf.
 *
 * A branch is not a series, but ticking one is the fastest way to say "all of these": descent is on
 * the bracket path, where a parent is always a prefix of its children and `[ab]` cannot be mistaken
 * for a parent of `[abc]` because the next character is always a `[`.
 */
export const jsonKeyTreeLeavesUnder = (nodes: JsonKeyTreeNode[] = [], path: string): string[] => {
    const node = nodes.find((entry) => entry.path === path);
    if (!node) return [];
    // Checked before the prefix walk below: the keyless document's path is empty, which is a prefix
    // of every other path there could be.
    if (node.leaf) return [node.path];
    return nodes.filter((entry) => entry.leaf && entry.path.startsWith(path)).map((entry) => entry.path);
};

/**
 * Whether this row has anything the picker can offer.
 *
 * True for a document with keys and for a bare value, which is a series in its own right; false
 * only when the column holds something that is not a JSON document at all, where the row inspector
 * is the whole answer.
 */
export const jsonKeyDocumentHasKeys = (value: unknown): boolean => buildJsonKeyTree(value).length > 0;

/**
 * Whether a value is a JSON document at all.
 *
 * The cheap half of `jsonKeyDocumentHasKeys`: it answers from the parse alone, without walking the
 * document into a tree. That is enough for the two callers that only need to know whether there is
 * something to open — a grid cell deciding whether to carry a control, and the matching field in the
 * row inspector — and both of them ask it once per row.
 */
export const isJsonKeyDocument = (value: unknown): boolean => parseJsonKeyDocument(value) !== undefined;

/** Paths of every leaf, which is the full set a "select all" may reach. */
export const jsonKeyTreeLeafPaths = (nodes: JsonKeyTreeNode[] = []): string[] =>
    nodes.filter((node) => node.leaf).map((node) => node.path);

/** How many of the picked paths the chart can actually draw — the count the footer states as series. */
/**
 * How many lines the detail view will draw at once.
 *
 * Lives here rather than in the detail view because the picker has to say the same number *before*
 * the detail view opens — a footer promising 200 series in front of a chart that draws four is a
 * promise the next screen breaks.
 */
export const MAX_JSON_KEY_SERIES = 4;

export const jsonKeyTreeSeriesCount = (nodes: JsonKeyTreeNode[] = [], selected: string[] = []): number => {
    const picked = new Set(selected);
    return nodes.filter((node) => node.leaf && node.numeric && picked.has(node.path)).length;
};

/**
 * Hide nodes the filter does not match.
 *
 * Filtering flattens the tree rather than pruning it: a match three levels down is shown with its
 * full path written ahead of the key, which says where it came from in less room than rendering
 * every ancestor above it — and without the ancestors pushing the matches off the first screen.
 *
 * Leaves only. A branch matches whenever anything above it in its own path does, so on a document
 * that nests deeply a single term returns the whole chain — ninety rows reading
 * `d1.d2…d8`, `d1.d2…d8.d9`, `d1.d2…d8.d9.d10` — none of which holds a value. What a filter is for
 * is finding the key that does.
 */
export const filterJsonKeyTree = (nodes: JsonKeyTreeNode[] = [], filter = ''): JsonKeyTreeNode[] => {
    const needle = String(filter ?? '').trim().toLowerCase();
    if (!needle) return nodes;
    return nodes.filter((node) => node.leaf && (node.dotted.toLowerCase().includes(needle) || node.path.toLowerCase().includes(needle)));
};

/**
 * Which nodes are visible once some are collapsed.
 *
 * A node is hidden when any collapsed node is one of its ancestors; the collapsed node itself stays
 * so it can be reopened. Ancestry is tested on the bracket path, where a parent is always a prefix
 * of its children and `[ab]` cannot be mistaken for a parent of `[abc]`.
 */
export const visibleJsonKeyTree = (nodes: JsonKeyTreeNode[] = [], collapsed: Set<string> = new Set()): JsonKeyTreeNode[] => {
    if (collapsed.size === 0) return nodes;
    return nodes.filter((node) => {
        for (const path of collapsed) {
            if (node.path !== path && node.path.startsWith(path)) return false;
        }
        return true;
    });
};

/**
 * Series names short enough to read, long enough to tell apart.
 *
 * Two branches both ending in `value` produce two legend entries called `value`. A colliding name
 * grows one segment leftwards until the whole set is unique, so `temperature.value` and
 * `humidity.value` appear only once something actually collides — names that never collided stay
 * short.
 */
export const shortJsonKeyNames = (dottedPaths: string[] = []): string[] => {
    const parts = dottedPaths.map((path) => String(path ?? '').split('.'));
    const longest = parts.reduce((max, part) => Math.max(max, part.length), 1);
    let names = parts.map((part) => part[part.length - 1] ?? '');

    for (let depth = 2; depth <= longest && new Set(names).size !== names.length; depth += 1) {
        names = parts.map((part) => part.slice(-depth).join('.'));
    }

    return names;
};
